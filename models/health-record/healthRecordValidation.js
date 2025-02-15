"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthRecord = exports.HealthRecordUpdate = void 0;
const zod_1 = require("zod");
const healthRecordService_1 = require("./healthRecordService");
const Symptoms = zod_1.z.object({
    name: zod_1.z
        .string()
        .trim()
        .min(1, "Symptom name is required")
        .max(healthRecordService_1.MAX_CHAR_MEDIUM, (0, healthRecordService_1.maxValidationMessage)("Symptom", healthRecordService_1.MAX_CHAR_MEDIUM)),
    startDate: zod_1.z.date().max(new Date(), "Start date cannot be in the future"),
    duration: zod_1.z
        .string()
        .optional()
        .refine((val) => !val || /^\d+\s*(days?|weeks?|months?|years?)$/i.test(val), "Duration must be in format: '5 days', '2 weeks', '1 month', etc."),
});
const MedicalConsultation = zod_1.z.object({
    consultant: zod_1.z
        .string()
        .trim()
        .min(2, (0, healthRecordService_1.minValidationMessage)("Consultant", 2))
        .max(healthRecordService_1.MAX_CHAR_SHORT, (0, healthRecordService_1.maxValidationMessage)("Consultant", healthRecordService_1.MAX_CHAR_SHORT)),
    date: zod_1.z.date().max(new Date(), "Consultation date cannot be in the future"),
    diagnosis: zod_1.z
        .string()
        .trim()
        .min(1, "Diagnosis is required")
        .max(healthRecordService_1.MAX_CHAR_LONG, (0, healthRecordService_1.maxValidationMessage)("Diagnosis", healthRecordService_1.MAX_CHAR_LONG)),
    followUpActions: zod_1.z
        .array(zod_1.z
        .string()
        .trim()
        .min(2, (0, healthRecordService_1.minValidationMessage)("Follow-up actions", 2))
        .max(healthRecordService_1.MAX_CHAR_LONG, (0, healthRecordService_1.maxValidationMessage)("Follow-up actions", healthRecordService_1.MAX_CHAR_LONG)))
        .default([]),
});
exports.HealthRecordUpdate = zod_1.z.object({
    description: zod_1.z
        .string()
        .trim()
        .min(2, (0, healthRecordService_1.minValidationMessage)("Description", 2))
        .max(healthRecordService_1.MAX_CHAR_LONG, (0, healthRecordService_1.maxValidationMessage)("Description", healthRecordService_1.MAX_CHAR_LONG))
        .optional(),
    symptoms: zod_1.z.array(Symptoms).default([]),
    status: zod_1.z.enum(healthRecordService_1.STATUS_TYPES).optional(),
    treatmentsTried: zod_1.z
        .array(zod_1.z
        .string()
        .trim()
        .min(2, (0, healthRecordService_1.minValidationMessage)("Treatments tried", 2))
        .max(healthRecordService_1.MAX_CHAR_LONG, (0, healthRecordService_1.maxValidationMessage)("Treatments tried", healthRecordService_1.MAX_CHAR_LONG)))
        .default([]),
    improvementStatus: zod_1.z.enum(healthRecordService_1.IMPROVEMENT_STATUS).default("stable"),
    medicalConsultations: zod_1.z.array(MedicalConsultation).default([]),
    createdAt: zod_1.z.date().optional(),
    updatedAt: zod_1.z.date().optional(),
});
exports.HealthRecord = zod_1.z.object({
    user: zod_1.z
        .string()
        .trim()
        .min(2, (0, healthRecordService_1.minValidationMessage)("User", 2))
        .max(healthRecordService_1.MAX_CHAR_SHORT, (0, healthRecordService_1.maxValidationMessage)("User", healthRecordService_1.MAX_CHAR_SHORT))
        .default("me"),
    description: zod_1.z
        .string()
        .trim()
        .min(2, (0, healthRecordService_1.minValidationMessage)("Description", 2))
        .max(healthRecordService_1.MAX_CHAR_LONG, (0, healthRecordService_1.maxValidationMessage)("Description", healthRecordService_1.MAX_CHAR_LONG)),
    symptoms: zod_1.z.array(Symptoms).min(1, "At least one symptom is required"),
    status: zod_1.z.enum(healthRecordService_1.STATUS_TYPES).default("open"),
    treatmentsTried: zod_1.z
        .array(zod_1.z
        .string()
        .trim()
        .min(2, (0, healthRecordService_1.minValidationMessage)("Treatments tried", 2))
        .max(healthRecordService_1.MAX_CHAR_LONG, (0, healthRecordService_1.maxValidationMessage)("Treatments tried", healthRecordService_1.MAX_CHAR_LONG)))
        .default([]),
    improvementStatus: zod_1.z.enum(healthRecordService_1.IMPROVEMENT_STATUS).default("stable"),
    medicalConsultations: zod_1.z.array(MedicalConsultation).default([]),
    severity: zod_1.z.enum(healthRecordService_1.SEVERITY_TYPES),
    updates: zod_1.z.array(exports.HealthRecordUpdate).default([]),
    createdAt: zod_1.z.date().optional(),
    updatedAt: zod_1.z.date().optional(),
});
