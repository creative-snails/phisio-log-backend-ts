import mongoose from "mongoose";
import { IMPROVEMENT_STATUS, SEVERITY_TYPES, STATUS_TYPES } from "./healthRecordService";
import { HealthRecordType, HealthRecordUpdateType } from "./healthRecordValidation";

const { Schema } = mongoose;

const symptomSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  startDate: Date,
});

const medicalConsultationSchema = new Schema({
  consultant: {
    type: String,
    required: true,
    trim: true,
  },
  date: {
    type: Date,
    required: true,
  },
  diagnosis: {
    type: String,
    required: true,
    trim: true,
  },
  followUpActions: {
    type: [String],
    default: [],
  },
});

const updateSchema = new Schema<HealthRecordUpdateType>(
  {
    description: {
      type: String,
      trim: true,
    },
    symptoms: {
      type: [symptomSchema],
      default: [],
    },
    status: {
      type: String,
      enum: STATUS_TYPES,
      default: "open",
    },
    treatmentsTried: {
      type: [String],
      default: [],
    },
    improvementStatus: {
      type: String,
      enum: IMPROVEMENT_STATUS,
      default: "stable",
    },
    medicalConsultations: {
      type: [medicalConsultationSchema],
      default: [],
    },
    severity: {
      type: String,
      enum: SEVERITY_TYPES,
      default: "variable",
    },
  },
  { timestamps: true }
);

const recordSchema = new Schema<HealthRecordType>(
  {
    user: {
      type: String,
      default: "me",
      // required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    symptoms: {
      type: [symptomSchema],
      required: true,
      validate: {
        validator: (symptoms: string[]) => symptoms.length > 0,
        message: "At least one symptom is required",
      },
    },
    status: {
      type: String,
      enum: STATUS_TYPES,
      default: "open",
    },
    treatmentsTried: {
      type: [String],
      default: [],
    },
    improvementStatus: {
      type: String,
      enum: IMPROVEMENT_STATUS,
      default: "stable",
    },
    medicalConsultations: {
      type: [medicalConsultationSchema],
      default: [],
    },
    severity: {
      type: String,
      enum: SEVERITY_TYPES,
      default: "variable",
    },
    updates: {
      type: [updateSchema],
      default: [],
    },
  },
  { timestamps: true }
);

const HealthRecord = mongoose.model("Record", recordSchema);

export default HealthRecord;
