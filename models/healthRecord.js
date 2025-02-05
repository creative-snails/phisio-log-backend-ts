"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const { Schema } = mongoose_1.default;
const symptomSchema = new Schema({
    name: String,
    startDate: Date,
    duration: String,
});
const medicalConsultationSchema = new Schema({
    consultant: String,
    date: Date,
    diagnosis: String,
    followUpActions: [String],
});
const updateSchema = new Schema({
    description: String,
    symptoms: [symptomSchema],
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
    medicalConsultations: [medicalConsultationSchema],
}, { timestamps: true });
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
    symptoms: [symptomSchema],
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
    treatmentsTried: [String],
    improvementStatus: {
        type: String,
        enum: ["improving", "stable", "worsening"],
        default: "stable",
    },
    medicalConsultations: [medicalConsultationSchema],
    updates: [updateSchema],
}, { timestamps: true });
const Record = mongoose_1.default.model("Record", recordSchema);
exports.default = Record;
