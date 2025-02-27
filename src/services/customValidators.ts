import { ZodError } from "zod";
import prompts from "../ai-prompts/prompts";
import { HealthRecordType, Z_HealthRecord } from "../models/health-record/healthRecordValidation";
import { Conversation } from "../routes/healthRecords.routes";
import { textGen } from "./genAI";

interface ValidationHelathRecordReturn {
  success: boolean;
  systemPrompt?: string;
  assistantPrompt?: string;
  validationErrors?: Array<{ field: string; message: string }>;
}

const MINIMUM_SYMPTOMS = 2;

export async function validateHealthRecord(
  healthRecord: Partial<HealthRecordType>,
  conversation: Conversation
): Promise<ValidationHelathRecordReturn> {
  // Convert dates to valid dates before handing over to validation
  healthRecord.symptoms = healthRecord.symptoms?.map((symptom) => ({
    ...symptom,
    startDate: symptom.startDate ? new Date(symptom.startDate) : new Date(),
  }));

  healthRecord.medicalConsultations = healthRecord.medicalConsultations?.map((consultation) => ({
    ...consultation,
    date: consultation.date ? new Date(consultation.date) : new Date(),
  }));

  console.log(healthRecord);

  if (healthRecord?.createdAt) {
    healthRecord.createdAt = healthRecord.createdAt ? new Date(healthRecord.createdAt) : new Date();
  }
  if (healthRecord?.updatedAt) {
    healthRecord.updatedAt = healthRecord.updatedAt ? new Date(healthRecord.updatedAt) : new Date();
  }

  const { additionalSymptoms, treatmentsTried, medicalConsultations } = conversation.requestedData;

  try {
    const validatedRecord = Z_HealthRecord.parse(healthRecord);
    console.log("Validation successful!");

    if (!additionalSymptoms && validatedRecord.symptoms.length < MINIMUM_SYMPTOMS) {
      conversation.requestedData.additionalSymptoms = true;
      return {
        success: true,
        assistantPrompt: prompts.symptoms.assistant,
        systemPrompt: prompts.symptoms.system,
      };
    }
    if (!treatmentsTried && !validatedRecord.treatmentsTried.length) {
      conversation.requestedData.treatmentsTried = true;
      return {
        success: true,
        assistantPrompt: prompts.treatments.assistant,
        systemPrompt: prompts.treatments.system,
      };
    }
    if (!medicalConsultations && !validatedRecord.medicalConsultations.length) {
      conversation.requestedData.medicalConsultations = true;
      return {
        success: true,
        assistantPrompt: prompts.consultaions.assistant,
        systemPrompt: prompts.consultaions.system,
      };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof ZodError) {
      let validationPrompt = prompts.validation;

      const validationErrors = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      const missingFields = validationErrors.filter((err) => err.message.includes("Required")).map((err) => err.field);
      const invalidFields = validationErrors
        .filter((err) => !err.message.includes("Required"))
        .map((err) => `${err.field} (${err.message})`);

      if (missingFields.length) {
        validationPrompt += "\nMissing required fields:\n";
        missingFields.forEach((field) => (validationPrompt += `- ${field}\n`));
      }

      if (invalidFields.length) {
        validationPrompt += "\nFields with invalid data:\n";
        invalidFields.forEach((field) => (validationPrompt += `- ${field}\n`));
      }

      return {
        success: false,
        validationErrors,
        assistantPrompt: await textGen([{ role: "user", content: validationPrompt }]),
      };
    }
  }

  return {
    success: false,
  };
}
