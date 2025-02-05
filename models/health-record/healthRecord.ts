import mongoose from "mongoose";
import { IMPROVEMENT_STATUS, SEVERITY_TYPES, STATUS_TYPES } from "./healthRecordService";
import { BaseHealth, HealthRecord, HealthRecordUpdate } from "./healthRecordValidation";

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
    validate: {
      validator: (v: Date) => v <= new Date(),
      message: "Start date cannot be in the future",
    },
  },
  duration: {
    type: String,
    validate: {
      validator: (v: string) => !v || /^\d+\s*(days?|weeks?|months?|years?)$/i.test(v),
      message: "Invalid duration format. Duration must be in format: '5 days', '2 weeks', '1 month', etc.",
    },
  },
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
    validate: {
      validator: (v: Date) => v <= new Date(),
      message: "Consultation date cannot be in the future",
    },
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

const baseHealthSchema = new Schema<BaseHealth>(
  {
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
  },
  { timestamps: true }
);

const updateSchema = new Schema<HealthRecordUpdate>({
  description: {
    type: String,
    required: false,
    trim: true,
  },
  symptoms: {
    type: [symptomSchema],
    required: false,
    default: [],
  },
});
updateSchema.add(baseHealthSchema);

const recordSchema = new Schema<HealthRecord>({
  user: {
    type: String,
    default: "me",
    required: true,
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
});
recordSchema.add(baseHealthSchema);

const Record = mongoose.model("Record", recordSchema);

export default Record;
