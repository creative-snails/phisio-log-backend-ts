import mongoose from "mongoose";
import { STAGE_TYPES, SEVERITY_TYPES, PROGRESSION_TYPES } from "./healthRecordService";
import { HealthRecordType, HealthRecordUpdateType } from "./healthRecordValidation";

const { Schema } = mongoose;

const statusSchema = new Schema(
  {
    stage: {
      type: String,
      enum: STAGE_TYPES,
      required: true,
    },
    severity: {
      type: String,
      enum: SEVERITY_TYPES,
      required: true,
    },
    progression: {
      type: String,
      enum: PROGRESSION_TYPES,
      required: true,
    },
  },
  { _id: false } // Prevent creation of a new _id field for nested schemas
);

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
      enum: statusSchema,
      default: "open",
    },
    treatmentsTried: {
      type: [String],
      default: [],
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
    description: {
      type: String,
      required: true,
      trim: true,
    },
    symptoms: {
      type: [symptomSchema],
      required: true,
      validate: {
        validator: (symptoms: unknown[]) => symptoms.length > 0,
        message: "At least one symptom is required",
      },
    },
    status: {
      type: statusSchema,
      required: true,
    },
    treatmentsTried: {
      type: [String],
      default: [],
    },
    medicalConsultations: {
      type: [medicalConsultationSchema],
      default: [],
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
