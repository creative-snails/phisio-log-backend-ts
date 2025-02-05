import z from "zod";
import { IMPROVEMENT_STATUS, SEVERITY_TYPES, STATUS_TYPES } from "./healthRecordService";

const symptomValidationSchema = z.object({
  name: z.string().min(1, "Symptom name is required").trim(),
  startDate: z.date().max(new Date(), "Start date cannot be in the future"),
  duration: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d+\s(days?|weeks?|years?)$/i.test(val),
      "Duration must be in format: '5 days', '2 weeks', '1 month', etc."
    ),
});

const medicalConsultationValidationSchema = z.object({
  consultant: z.string().min(1, "Consultant name is required").trim(),
  date: z.date().max(new Date(), "Consultation date cannot be in the future"),
  diagnosis: z.string().min(1, "Diagnosis is required").trim(),
  followUpActions: z.array(z.string().trim()).default([]).optional(),
});

export const baseHealthValdiationSchema = z.object({
  description: z
    .string()
    .min(1, "Description is required")
    .max(10000, "Description must be less than 10000 characters")
    .trim(),
  symptoms: z.array(symptomValidationSchema).min(1, "At least one symptom is required"),
  status: z.enum(STATUS_TYPES).default("open"),
  treatmentsTried: z.array(z.string().trim()).default([]).optional(),
  improvementStatus: z.enum(IMPROVEMENT_STATUS).default("stable"),
  medicalConsultations: z.array(medicalConsultationValidationSchema).default([]).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const healthRecordUpdateValidationSchema = z.object({
  description: z.string().max(10000, "Description must be less than 10000 characters").trim().optional(),
  symptoms: z.array(symptomValidationSchema).default([]).optional(),
  status: z.enum(STATUS_TYPES).optional(),
  treatmentsTried: z.array(z.string().trim()).default([]).optional(),
  improvementStatus: z.enum(IMPROVEMENT_STATUS).default("stable").optional(),
  medicalConsultations: z.array(medicalConsultationValidationSchema).default([]).optional(),
});
export const healthRecordValidationSchema = baseHealthValdiationSchema.extend({
  user: z.string().trim().default("me"),
  severity: z.enum(SEVERITY_TYPES),
  updates: z.array(healthRecordUpdateValidationSchema).default([]),
});

export type BaseHealth = z.infer<typeof baseHealthValdiationSchema>;
export type HealthRecordUpdate = z.infer<typeof healthRecordUpdateValidationSchema>;
export type HealthRecord = z.infer<typeof healthRecordValidationSchema>;
