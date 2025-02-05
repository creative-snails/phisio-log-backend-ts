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
        validate: {
            validator: (v) => v <= new Date(),
            message: "Start date cannot be in the future",
        },
    },
    duration: {
        type: String,
        validate: {
            validator: (v) => !v || /^\d+\s*(days?|weeks?|months?|years?)$/i.test(v),
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
            validator: (v) => v <= new Date(),
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
const baseHealthSchema = new Schema({
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
}, { timestamps: true });
const updateSchema = new Schema({
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
const recordSchema = new Schema({
    user: {
        type: String,
        default: "me",
        required: true,
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
});
recordSchema.add(baseHealthSchema);
const Record = mongoose_1.default.model("Record", recordSchema);
exports.default = Record;
