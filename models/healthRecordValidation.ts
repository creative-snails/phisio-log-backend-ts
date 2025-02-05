import z from "zod";

const symptomValidationSchema = z.object({
  name: z.string(),
  startDate: z.date(),
  duration: z.string().optional(),
});

const medicalConsultationValidationSchema = z.object({
  consultant: z.string(),
  date: z.date(),
  diognosis: z.string(),
  followUpActions: z.array(z.string()).default([]),
});

export const healthRecordUpdateValidationSchema = z.object({
  updatedAt: z.date().default(new Date()),
  description: z.string().max(10000).optional(),
  symptoms: z.array(symptomValidationSchema).optional(),
  status: z.enum(["open", "closed", "in-progress"]).default("open"),
  treatmentsTried: z.array(z.string()).optional(),
  improvmentStatus: z.enum(["improving", "stable", "worsening"]).default("stable"),
  medicalConsultations: z.array(medicalConsultationValidationSchema).optional(),
});

export const healthRecordValidationSchema = z.object({
  user: z.string().default("me"),
  description: z.string().max(10000),
  symptoms: z.array(symptomValidationSchema),
  status: z.enum(["open", "closed", "in-progress"]).default("open"),
  severity: z.enum(["mild", "moderate", "severe"]),
  treamtmentsTried: z.array(z.string()).optional(),
  impromentStatus: z.enum(["improving", "stable", "worsening"]).default("stable"),
  medicalConsultations: z.array(medicalConsultationValidationSchema),
  updates: z.array(healthRecordUpdateValidationSchema),
  createdAt: z.date().default(new Date()),
  updatedAt: z.date().default(new Date()),
});

export type healthRecordUpdate = z.infer<typeof healthRecordUpdateValidationSchema>;
export type healthRecord = z.infer<typeof healthRecordValidationSchema>;
