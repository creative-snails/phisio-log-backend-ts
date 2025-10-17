import { Types } from "mongoose";
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

const Z_MedicalConsultation = z
  .object({
    consultant: z
      .string()
      .trim()
      .min(MIN_CHAR_SHORT, minValidationMessage("Consultant", MIN_CHAR_SHORT))
      .max(MAX_CHAR_SHORT, maxValidationMessage("Consultant", MAX_CHAR_SHORT)),
    date: z.date().optional(),
    diagnosis: z
      .string()
      .trim()
      .min(MIN_CHAR_SHORT, minValidationMessage("Diagnosis", MIN_CHAR_SHORT))
      .max(MAX_CHAR_LONG, maxValidationMessage("Diagnosis", MAX_CHAR_LONG))
      .optional(),
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
  })
  .superRefine((val, ctx) => {
    const now = new Date();
    const isFuture = val.date instanceof Date && val.date.getTime() > now.getTime();

    if (isFuture) {
      // Planned consultation: must not include diagnosis or follow-ups
      if (val.diagnosis && val.diagnosis.trim() !== "") {
        ctx.addIssue({
          path: ["diagnosis"],
          code: z.ZodIssueCode.custom,
          message: "Planned consultations must not include a diagnosis.",
        });
      }
    } else {
      // Past or no date: must include diagnosis or at least one follow-up action
      const hasDiagnosis = Boolean(val.diagnosis && val.diagnosis.trim() !== "");
      const hasFollowUps = Array.isArray(val.followUpActions) && val.followUpActions.length > 0;
      if (!hasDiagnosis && !hasFollowUps) {
        ctx.addIssue({
          path: ["diagnosis"],
          code: z.ZodIssueCode.custom,
          message: "Past consultations must include a diagnosis or follow-up actions.",
        });
      }
    }
  });

export const Z_HealthRecord = z.object({
  user: z
    .string()
    .trim()
    .min(2, minValidationMessage("User", 2))
    .max(MAX_CHAR_SHORT, maxValidationMessage("User", MAX_CHAR_SHORT))
    .optional()
    .default("me"),
  rootId: z.string().optional().nullable(),
  description: z
    .string()
    .min(MIN_CHAR_MEDIUM, minValidationMessage("Description", MIN_CHAR_MEDIUM))
    .max(MAX_CHAR_LONG, maxValidationMessage("Description", MAX_CHAR_LONG)),
  symptoms: z.array(Z_Symptom).min(1, "At least one symptom is required"),
  status: Z_Status,
  treatmentsTried: z
    .array(
      z
        .string()
        .trim()
        .min(MIN_CHAR_SHORT, minValidationMessage("Treatments tried", MIN_CHAR_SHORT))
        .max(MAX_CHAR_MEDIUM, maxValidationMessage("Treatments tried", MAX_CHAR_MEDIUM))
    )
    .optional()
    .default([]),
  medicalConsultations: z
    .array(Z_MedicalConsultation)
    .max(10, "You can only have up to 10 medical consultations.")
    .optional()
    .default([]),
  updates: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format")).optional(),
});

// Schema for PATCH operations, allowing partial updates to any field
export const Z_HealthRecordPatch = Z_HealthRecord.extend({
  symptoms: z.array(Z_Symptom.partial()).optional(),
  status: Z_Status.partial().optional(),
  medicalConsultations: z.array(Z_MedicalConsultation._def.schema.partial()).optional(),
})
  .omit({
    rootId: true, // rootId is immutable
    updates: true, // updates array is managed by the system
  })
  .partial();

export const Z_HealthRecordUpdate = Z_HealthRecord.omit({
  rootId: true,
  updates: true,
}).partial({
  symptoms: true,
  status: true,
  treatmentsTried: true,
  medicalConsultations: true,
});

export type HealthRecordType = z.infer<typeof Z_HealthRecord> & {
  parentId?: Types.ObjectId | null;
  updates?: Types.ObjectId[];
};
export type SymptomType = z.infer<typeof Z_Symptom>;
export type MedicalConsultationType = z.infer<typeof Z_MedicalConsultation>;
