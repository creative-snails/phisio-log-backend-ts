"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const healthRecordService_1 = require("./healthRecordService");
const { Schema } = mongoose_1.default;
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
const updateSchema = new Schema({
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
        enum: healthRecordService_1.STATUS_TYPES,
        default: "open",
    },
    treatmentsTried: {
        type: [String],
        default: [],
    },
    improvementStatus: {
        type: String,
        enum: healthRecordService_1.IMPROVEMENT_STATUS,
        default: "stable",
    },
    medicalConsultations: {
        type: [medicalConsultationSchema],
        default: [],
    },
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
        trim: true,
    },
    symptoms: {
        type: [symptomSchema],
        required: true,
    },
    status: {
        type: String,
        enum: healthRecordService_1.STATUS_TYPES,
        default: "open",
    },
    treatmentsTried: {
        type: [String],
        default: [],
    },
    improvementStatus: {
        type: String,
        enum: healthRecordService_1.IMPROVEMENT_STATUS,
        default: "stable",
    },
    medicalConsultations: {
        type: [medicalConsultationSchema],
        default: [],
    },
    severity: {
        type: String,
        enum: healthRecordService_1.SEVERITY_TYPES,
        required: true,
    },
    updates: {
        type: [updateSchema],
        default: [],
    },
}, { timestamps: true });
const Record = mongoose_1.default.model("Record", recordSchema);
exports.default = Record;
