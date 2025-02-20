import { z } from "zod";
import {
  IMPROVEMENT_STATUS,
  MAX_CHAR_LONG,
  MAX_CHAR_MEDIUM,
  MAX_CHAR_SHORT,
  maxValidationMessage,
  minValidationMessage,
  SEVERITY_TYPES,
  STATUS_TYPES,
} from "./healthRecordService";

const Z_Symptoms = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Symptom name is required")
    .max(MAX_CHAR_MEDIUM, maxValidationMessage("Symptom", MAX_CHAR_MEDIUM)),
  startDate: z.date().max(new Date(), "Start date cannot be in the future").optional(),
  duration: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d+\s*(days?|weeks?|months?|years?)$/i.test(val),
      "Duration must be in format: '5 days', '2 weeks', '1 month', etc."
    ),
});

const Z_MedicalConsultation = z.object({
  consultant: z
    .string()
    .trim()
    .min(2, minValidationMessage("Consultant", 2))
    .max(MAX_CHAR_SHORT, maxValidationMessage("Consultant", MAX_CHAR_SHORT)),
  date: z.date().max(new Date(), "Consultation date cannot be in the future"),
  diagnosis: z
    .string()
    .trim()
    .min(1, "Diagnosis is required")
    .max(MAX_CHAR_LONG, maxValidationMessage("Diagnosis", MAX_CHAR_LONG)),
  followUpActions: z
    .array(
      z
        .string()
        .trim()
        .min(2, minValidationMessage("Follow-up actions", 2))
        .max(MAX_CHAR_LONG, maxValidationMessage("Follow-up actions", MAX_CHAR_LONG))
    )
    .default([]),
});

export const Z_HealthRecordUpdate = z.object({
  description: z
    .string()
    .trim()
    .min(2, minValidationMessage("Description", 2))
    .max(MAX_CHAR_LONG, maxValidationMessage("Description", MAX_CHAR_LONG))
    .optional(),
  symptoms: z.array(Z_Symptoms).default([]),
  status: z.enum(STATUS_TYPES).optional(),
  treatmentsTried: z
    .array(
      z
        .string()
        .trim()
        .min(2, minValidationMessage("Treatments tried", 2))
        .max(MAX_CHAR_LONG, maxValidationMessage("Treatments tried", MAX_CHAR_LONG))
    )
    .default([]),
  improvementStatus: z.enum(IMPROVEMENT_STATUS).default("stable"),
  medicalConsultations: z.array(Z_MedicalConsultation).default([]),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const Z_HealthRecord = z.object({
  user: z
    .string()
    .trim()
    .min(2, minValidationMessage("User", 2))
    .max(MAX_CHAR_SHORT, maxValidationMessage("User", MAX_CHAR_SHORT))
    .default("me"),
  description: z
    .string()
    .trim()
    .min(2, minValidationMessage("Description", 2))
    .max(MAX_CHAR_LONG, maxValidationMessage("Description", MAX_CHAR_LONG)),
  symptoms: z.array(Z_Symptoms).min(1, "At least one symptom is required"),
  status: z.enum(STATUS_TYPES).default("open"),
  treatmentsTried: z
    .array(
      z
        .string()
        .trim()
        .min(2, minValidationMessage("Treatments tried", 2))
        .max(MAX_CHAR_LONG, maxValidationMessage("Treatments tried", MAX_CHAR_LONG))
    )
    .default([]),
  improvementStatus: z.enum(IMPROVEMENT_STATUS).default("stable"),
  medicalConsultations: z.array(Z_MedicalConsultation).default([]),
  severity: z.enum(SEVERITY_TYPES),
  updates: z.array(Z_HealthRecordUpdate).default([]),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type HealthRecordUpdateType = z.infer<typeof Z_HealthRecordUpdate>;
export type HealthRecordType = z.infer<typeof Z_HealthRecord>;
