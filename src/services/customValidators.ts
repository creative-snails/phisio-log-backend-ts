import { ZodError } from "zod";
import prompts from "../ai-prompts/prompts";
import {
  HealthRecordType,
  HealthRecordUpdateType,
  Z_HealthRecord,
  Z_HealthRecordUpdate,
} from "../models/health-record/healthRecordValidation";
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
  healthRecord: Partial<HealthRecordType | HealthRecordUpdateType>,
  conversation: Conversation,
  isUpdate?: boolean
): Promise<ValidationHelathRecordReturn> {
  // Convert dates to valid dates before handing over to validation
  if (healthRecord.symptoms?.length) {
    healthRecord.symptoms = healthRecord.symptoms?.map((symptom) => ({
      ...symptom,
      startDate: symptom.startDate ? new Date(symptom.startDate) : new Date(),
    }));
  }

  if (healthRecord.medicalConsultations?.length) {
    healthRecord.medicalConsultations = healthRecord.medicalConsultations.map((consultation) => ({
      ...consultation,
      date: consultation.date ? new Date(consultation.date) : new Date(),
    }));
  }

  if (healthRecord?.createdAt) {
    healthRecord.createdAt = healthRecord.createdAt ? new Date(healthRecord.createdAt) : new Date();
  }
  if (healthRecord?.updatedAt) {
    healthRecord.updatedAt = healthRecord.updatedAt ? new Date(healthRecord.updatedAt) : new Date();
  }

  const { additionalSymptoms, treatmentsTried, medicalConsultations, followUps } = conversation.requestedData;

  try {
    const validatedRecord = isUpdate ? Z_HealthRecordUpdate.parse(healthRecord) : Z_HealthRecord.parse(healthRecord);
    console.log("Validation successful!");

    if (!additionalSymptoms && validatedRecord.symptoms.length < MINIMUM_SYMPTOMS) {
      conversation.requestedData.additionalSymptoms = true;
      return {
        success: true,
        assistantPrompt: prompts.assistant.symptoms,
        systemPrompt: prompts.system.symptoms(healthRecord),
      };
    }
    if (!treatmentsTried && !validatedRecord.treatmentsTried.length) {
      conversation.requestedData.treatmentsTried = true;
      return {
        success: true,
        assistantPrompt: prompts.assistant.treatments,
        systemPrompt: prompts.system.treatments(healthRecord),
      };
    }
    if (!medicalConsultations && !validatedRecord.medicalConsultations.length) {
      conversation.requestedData.medicalConsultations = true;
      return {
        success: true,
        assistantPrompt: prompts.assistant.consultations,
        systemPrompt: prompts.system.consultations(healthRecord),
      };
    }
    if (
      !followUps &&
      !validatedRecord.medicalConsultations[validatedRecord.medicalConsultations.length - 1]?.followUpActions.length
    ) {
      conversation.requestedData.followUps = true;
      return {
        success: true,
        assistantPrompt: prompts.assistant.followUps,
        systemPrompt: prompts.system.consultations(healthRecord),
      };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof ZodError) {
      let validationPrompt = prompts.system.validation;

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
