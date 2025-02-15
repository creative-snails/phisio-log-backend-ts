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
  startDate: {
    type: Date,
    required: true,
  },
  duration: String,
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
  },
  { timestamps: true }
);

const recordSchema = new Schema<HealthRecordType>(
  {
    user: {
      type: String,
      default: "me",
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    symptoms: {
      type: [symptomSchema],
      required: true,
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
      required: true,
    },
    updates: {
      type: [updateSchema],
      default: [],
    },
  },
  { timestamps: true }
);

const Record = mongoose.model("Record", recordSchema);

export default Record;
