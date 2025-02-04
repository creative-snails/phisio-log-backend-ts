import mongoose from "mongoose";

const { Schema } = mongoose;

const updateSchema = new Schema({
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  description: String,
  symptoms: [
    {
      name: String,
      startDate: Date,
      duration: String,
    },
  ],
  status: {
    type: String,
    enum: ["open", "closed", "in-progress"],
    default: "open",
  },
  treatmentsTried: [String],
  improvementStatus: {
    type: String,
    enum: ["improving", "stable", "worsening"],
    default: "stable",
  },
  medicalConsultations: [
    {
      consultant: String,
      date: Date,
      outcome: String,
      followUpActions: {
        type: [String],
        default: [],
      },
    },
  ],
  followUpActions: [String],
});

const recordSchema = new Schema({
  user: {
    type: String,
    default: "me",
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  symptoms: [
    {
      name: String,
      startDate: Date,
      duration: String,
    },
  ],
  status: {
    type: String,
    enum: ["open", "closed", "in-progress"],
    default: "open",
  },
  severity: {
    type: String,
    enum: ["mild", "moderate", "severe"],
    required: true,
  },
  treatmentsTried: {
    type: [String],
    required: true,
  },
  improvementStatus: {
    type: String,
    enum: ["improving", "stable", "worsening"],
    default: "stable",
  },
  medicalConsultations: [
    {
      consultant: String,
      date: Date,
      outcome: String,
      followUpActions: {
        type: [String],
        default: [],
      },
    },
  ],
  updates: [updateSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

recordSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const Record = mongoose.model("Record", recordSchema);

export default Record;
