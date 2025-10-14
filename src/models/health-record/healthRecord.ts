import mongoose from "mongoose";
import { PROGRESSION_TYPES, SEVERITY_TYPES, STAGE_TYPES } from "./healthRecordService";
import { HealthRecordType } from "./healthRecordValidation";

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
  { _id: false }
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
  date: Date,
  diagnosis: {
    type: String,
    trim: true,
  },
  followUpActions: {
    type: [String],
    default: [],
  },
});

const recordSchema = new Schema<HealthRecordType>(
  {
    user: {
      type: String,
      default: "me",
      //required: true,
    },
    rootId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Record",
      default: null,
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
    status: statusSchema,
    treatmentsTried: {
      type: [String],
      default: [],
    },
    medicalConsultations: {
      type: [medicalConsultationSchema],
      default: [],
    },
    updates: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Record",
      validate: {
        validator: function (this: HealthRecordType, updates: mongoose.Schema.Types.ObjectId[]) {
          // Only allow updates array on top-level records
          return !this.rootId || !updates || updates.length === 0;
        },
        message: "Child records (updates) cannot have their own updates array.",
      },
    },
  },
  { timestamps: true }
);

// Pre-save hook middleware to ensure updates array is only on top-level records
recordSchema.pre("save", function (next) {
  if (this.rootId) {
    this.updates = undefined;
  }
  next();
});

const HealthRecord = mongoose.model("Record", recordSchema);

export default HealthRecord;
