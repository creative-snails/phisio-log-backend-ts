"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRecordValidationSchema = exports.healthRecordUpdateValidationSchema = void 0;
const zod_1 = __importDefault(require("zod"));
const healthRecordService_1 = require("./healthRecordService");
const symptomValidationSchema = zod_1.default.object({
    name: zod_1.default
        .string()
        .trim()
        .min(1, "Symptom name is required")
        .max(healthRecordService_1.MAX_CHAR_MEDIUM, (0, healthRecordService_1.maxValidationMessage)("Symptom", healthRecordService_1.MAX_CHAR_MEDIUM)),
    startDate: zod_1.default.date().max(new Date(), "Start date cannot be in the future"),
    duration: zod_1.default
        .string()
        .optional()
        .refine((val) => !val || /^\d+\s*(days?|weeks?|months?|years?)$/i.test(val), "Duration must be in format: '5 days', '2 weeks', '1 month', etc."),
});
const medicalConsultationValidationSchema = zod_1.default.object({
    consultant: zod_1.default
        .string()
        .trim()
        .min(2, (0, healthRecordService_1.minValidationMessage)("Consultant", 2))
        .max(healthRecordService_1.MAX_CHAR_SHORT, (0, healthRecordService_1.maxValidationMessage)("Consultant", healthRecordService_1.MAX_CHAR_SHORT)),
    date: zod_1.default.date().max(new Date(), "Consultation date cannot be in the future"),
    diagnosis: zod_1.default
        .string()
        .trim()
        .min(1, "Diagnosis is required")
        .max(healthRecordService_1.MAX_CHAR_LONG, (0, healthRecordService_1.maxValidationMessage)("Diagnosis", healthRecordService_1.MAX_CHAR_LONG)),
    followUpActions: zod_1.default
        .array(zod_1.default
        .string()
        .trim()
        .min(2, (0, healthRecordService_1.minValidationMessage)("Follow-up actions", 2))
        .max(healthRecordService_1.MAX_CHAR_LONG, (0, healthRecordService_1.maxValidationMessage)("Follow-up actions", healthRecordService_1.MAX_CHAR_LONG)))
        .default([]),
});
exports.healthRecordUpdateValidationSchema = zod_1.default.object({
    description: zod_1.default
        .string()
        .trim()
        .min(2, (0, healthRecordService_1.minValidationMessage)("Description", 2))
        .max(healthRecordService_1.MAX_CHAR_LONG, (0, healthRecordService_1.maxValidationMessage)("Description", healthRecordService_1.MAX_CHAR_LONG))
        .optional(),
    symptoms: zod_1.default.array(symptomValidationSchema).default([]),
    status: zod_1.default.enum(healthRecordService_1.STATUS_TYPES).optional(),
    treatmentsTried: zod_1.default
        .array(zod_1.default
        .string()
        .trim()
        .min(2, (0, healthRecordService_1.minValidationMessage)("Treatments tried", 2))
        .max(healthRecordService_1.MAX_CHAR_LONG, (0, healthRecordService_1.maxValidationMessage)("Treatments tried", healthRecordService_1.MAX_CHAR_LONG)))
        .default([]),
    improvementStatus: zod_1.default.enum(healthRecordService_1.IMPROVEMENT_STATUS).default("stable"),
    medicalConsultations: zod_1.default.array(medicalConsultationValidationSchema).default([]),
    createdAt: zod_1.default.date().optional(),
    updatedAt: zod_1.default.date().optional(),
});
exports.healthRecordValidationSchema = zod_1.default.object({
    user: zod_1.default
        .string()
        .trim()
        .min(2, (0, healthRecordService_1.minValidationMessage)("User", 2))
        .max(healthRecordService_1.MAX_CHAR_SHORT, (0, healthRecordService_1.maxValidationMessage)("User", healthRecordService_1.MAX_CHAR_SHORT))
        .default("me"),
    description: zod_1.default
        .string()
        .trim()
        .min(2, (0, healthRecordService_1.minValidationMessage)("Description", 2))
        .max(healthRecordService_1.MAX_CHAR_LONG, (0, healthRecordService_1.maxValidationMessage)("Description", healthRecordService_1.MAX_CHAR_LONG)),
    symptoms: zod_1.default.array(symptomValidationSchema).min(1, "At least one symptom is required"),
    status: zod_1.default.enum(healthRecordService_1.STATUS_TYPES).default("open"),
    treatmentsTried: zod_1.default
        .array(zod_1.default
        .string()
        .trim()
        .min(2, (0, healthRecordService_1.minValidationMessage)("Treatments tried", 2))
        .max(healthRecordService_1.MAX_CHAR_LONG, (0, healthRecordService_1.maxValidationMessage)("Treatments tried", healthRecordService_1.MAX_CHAR_LONG)))
        .default([]),
    improvementStatus: zod_1.default.enum(healthRecordService_1.IMPROVEMENT_STATUS).default("stable"),
    medicalConsultations: zod_1.default.array(medicalConsultationValidationSchema).default([]),
    severity: zod_1.default.enum(healthRecordService_1.SEVERITY_TYPES),
    updates: zod_1.default.array(exports.healthRecordUpdateValidationSchema).default([]),
    createdAt: zod_1.default.date().optional(),
    updatedAt: zod_1.default.date().optional(),
});
