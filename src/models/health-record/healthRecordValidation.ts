import { z } from "zod";
import {
  MAX_CHAR_LONG,
  MAX_CHAR_MEDIUM,
  MAX_CHAR_SHORT,
  maxValidationMessage,
  MIN_CHAR_MEDIUM,
  MIN_CHAR_SHORT,
  minValidationMessage,
  PROGRESSION_TYPES,
  SEVERITY_TYPES,
  STAGE_TYPES,
} from "./healthRecordService";

export const Z_Stage = z.enum(STAGE_TYPES);
export const Z_Severity = z.enum(SEVERITY_TYPES);
export const Z_Progression = z.enum(PROGRESSION_TYPES);

const Z_LabeledEnumOption = <T extends z.ZodTypeAny>(enumSchema: T) =>
  z.object({
    label: z.string(),
    value: enumSchema,
  });

export const Z_StatusOptions = z.object({
  stage: z.array(Z_LabeledEnumOption(Z_Stage)),
  severity: z.array(Z_LabeledEnumOption(Z_Severity)),
  progression: z.array(Z_LabeledEnumOption(Z_Progression)),
});

export const Z_Status = z.object({
  stage: Z_Stage,
  severity: Z_Severity,
  progression: Z_Progression,
});

export const Z_Description = z
  .string()
  .min(MIN_CHAR_MEDIUM, minValidationMessage("Description", MIN_CHAR_MEDIUM))
  .max(MAX_CHAR_LONG, maxValidationMessage("Description", MAX_CHAR_LONG));

const Z_Symptom = z.object({
  name: z
    .string()
    .trim()
    .min(MIN_CHAR_SHORT, minValidationMessage("Symptom", MIN_CHAR_SHORT))
    .max(MAX_CHAR_MEDIUM, maxValidationMessage("Symptom", MAX_CHAR_MEDIUM)),
  startDate: z.date().optional(),
  // TODO: This is causing some strange behaviour, will address it in the future
  // startDate: z.date().max(new Date(), "Start date cannot be in the future").optional(),
});

const Z_MedicalConsultation = z.object({
  consultant: z
    .string()
    .trim()
    .min(MIN_CHAR_SHORT, minValidationMessage("Consultant", MIN_CHAR_SHORT))
    .max(MAX_CHAR_SHORT, maxValidationMessage("Consultant", MAX_CHAR_SHORT)),
  date: z.date().max(new Date(), "Consultation date cannot be in the future"),
  diagnosis: z
    .string()
    .trim()
    .min(MIN_CHAR_SHORT, minValidationMessage("Diagnosis", MIN_CHAR_SHORT))
    .max(MAX_CHAR_LONG, maxValidationMessage("Diagnosis", MAX_CHAR_LONG)),
  followUpActions: z
    .array(
      z
        .string()
        .trim()
        .min(MIN_CHAR_SHORT, minValidationMessage("Follow-up actions", MIN_CHAR_SHORT))
        .max(MAX_CHAR_MEDIUM, maxValidationMessage("Follow-up actions", MAX_CHAR_MEDIUM))
    )
    .optional()
    .default([]),
});

export const Z_HealthRecordUpdate = z.object({
  description: Z_Description.optional(),
  symptoms: z.array(Z_Symptom).optional().default([]),
  status: Z_Status.optional(),
  treatmentsTried: z
    .array(
      z
        .string()
        .trim()
        .min(MIN_CHAR_SHORT, minValidationMessage("Treatments tried", MIN_CHAR_SHORT))
        .max(MAX_CHAR_LONG, maxValidationMessage("Treatments tried", MAX_CHAR_LONG))
    )
    .optional()
    .default([]),
  medicalConsultations: z
    .array(Z_MedicalConsultation)
    .max(10, "You can only have up to 10 medical consultations.")
    .optional()
    .default([]),
});

export const Z_HealthRecord = z.object({
  user: z
    .string()
    .trim()
    .min(2, minValidationMessage("User", 2))
    .max(MAX_CHAR_SHORT, maxValidationMessage("User", MAX_CHAR_SHORT))
    .optional()
    .default("me"),
  description: Z_Description,
  symptoms: z.array(Z_Symptom).min(1, "At least one symptom is required"),
  status: Z_Status,
  treatmentsTried: z
    .array(
      z
        .string()
        .trim()
        .min(MIN_CHAR_SHORT, minValidationMessage("Treatments tried", MIN_CHAR_SHORT))
        .max(MAX_CHAR_SHORT, maxValidationMessage("Treatments tried", MAX_CHAR_SHORT))
    )
    .optional()
    .default([]),
  medicalConsultations: z
    .array(Z_MedicalConsultation)
    .max(10, "You can only have up to 10 medical consultations.")
    .optional()
    .default([]),
  updates: z.array(Z_HealthRecordUpdate).optional().default([]),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type HealthRecordUpdateType = z.infer<typeof Z_HealthRecordUpdate>;
export type HealthRecordType = z.infer<typeof Z_HealthRecord>;
