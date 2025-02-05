"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRecordValidationSchema = exports.healthRecordUpdateValidationSchema = void 0;
const zod_1 = __importDefault(require("zod"));
const symptomValidationSchema = zod_1.default.object({
    name: zod_1.default.string(),
    startDate: zod_1.default.date(),
    duration: zod_1.default.string().optional(),
});
const medicalConsultationValidationSchema = zod_1.default.object({
    consultant: zod_1.default.string(),
    date: zod_1.default.date(),
    diognosis: zod_1.default.string(),
    followUpActions: zod_1.default.array(zod_1.default.string()).default([]),
});
exports.healthRecordUpdateValidationSchema = zod_1.default.object({
    updatedAt: zod_1.default.date().default(new Date()),
    description: zod_1.default.string().max(10000).optional(),
    symptoms: zod_1.default.array(symptomValidationSchema).optional(),
    status: zod_1.default.enum(["open", "closed", "in-progress"]).default("open"),
    treatmentsTried: zod_1.default.array(zod_1.default.string()).optional(),
    improvmentStatus: zod_1.default.enum(["improving", "stable", "worsening"]).default("stable"),
    medicalConsultations: zod_1.default.array(medicalConsultationValidationSchema).optional(),
});
exports.healthRecordValidationSchema = zod_1.default.object({
    user: zod_1.default.string().default("me"),
    description: zod_1.default.string().max(10000),
    symptoms: zod_1.default.array(symptomValidationSchema),
    status: zod_1.default.enum(["open", "closed", "in-progress"]).default("open"),
    severity: zod_1.default.enum(["mild", "moderate", "severe"]),
    treamtmentsTried: zod_1.default.array(zod_1.default.string()).optional(),
    impromentStatus: zod_1.default.enum(["improving", "stable", "worsening"]).default("stable"),
    medicalConsultations: zod_1.default.array(medicalConsultationValidationSchema),
    updates: zod_1.default.array(exports.healthRecordUpdateValidationSchema),
    createdAt: zod_1.default.date().default(new Date()),
    updatedAt: zod_1.default.date().default(new Date()),
});
