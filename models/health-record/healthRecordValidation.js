"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRecordValidationSchema = exports.healthRecordUpdateValidationSchema = exports.baseHealthValdiationSchema = void 0;
const zod_1 = __importDefault(require("zod"));
const healthRecordService_1 = require("./healthRecordService");
const symptomValidationSchema = zod_1.default.object({
    name: zod_1.default.string().min(1, "Symptom name is required").trim(),
    startDate: zod_1.default.date().max(new Date(), "Start date cannot be in the future"),
    duration: zod_1.default
        .string()
        .optional()
        .refine((val) => !val || /^\d+\s(days?|weeks?|years?)$/i.test(val), "Duration must be in format: '5 days', '2 weeks', '1 month', etc."),
});
const medicalConsultationValidationSchema = zod_1.default.object({
    consultant: zod_1.default.string().min(1, "Consultant name is required").trim(),
    date: zod_1.default.date().max(new Date(), "Consultation date cannot be in the future"),
    diagnosis: zod_1.default.string().min(1, "Diagnosis is required").trim(),
    followUpActions: zod_1.default.array(zod_1.default.string().trim()).default([]).optional(),
});
exports.baseHealthValdiationSchema = zod_1.default.object({
    description: zod_1.default
        .string()
        .min(1, "Description is required")
        .max(10000, "Description must be less than 10000 characters")
        .trim(),
    symptoms: zod_1.default.array(symptomValidationSchema).min(1, "At least one symptom is required"),
    status: zod_1.default.enum(healthRecordService_1.STATUS_TYPES).default("open"),
    treatmentsTried: zod_1.default.array(zod_1.default.string().trim()).default([]).optional(),
    improvementStatus: zod_1.default.enum(healthRecordService_1.IMPROVEMENT_STATUS).default("stable"),
    medicalConsultations: zod_1.default.array(medicalConsultationValidationSchema).default([]).optional(),
    createdAt: zod_1.default.date().optional(),
    updatedAt: zod_1.default.date().optional(),
});
exports.healthRecordUpdateValidationSchema = zod_1.default.object({
    description: zod_1.default.string().max(10000, "Description must be less than 10000 characters").trim().optional(),
    symptoms: zod_1.default.array(symptomValidationSchema).default([]).optional(),
    status: zod_1.default.enum(healthRecordService_1.STATUS_TYPES).optional(),
    treatmentsTried: zod_1.default.array(zod_1.default.string().trim()).default([]).optional(),
    improvementStatus: zod_1.default.enum(healthRecordService_1.IMPROVEMENT_STATUS).default("stable").optional(),
    medicalConsultations: zod_1.default.array(medicalConsultationValidationSchema).default([]).optional(),
});
exports.healthRecordValidationSchema = exports.baseHealthValdiationSchema.extend({
    user: zod_1.default.string().trim().default("me"),
    severity: zod_1.default.enum(healthRecordService_1.SEVERITY_TYPES),
    updates: zod_1.default.array(exports.healthRecordUpdateValidationSchema).default([]),
});
