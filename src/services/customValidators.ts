import { ZodError } from "zod";
import prompts from "../ai-prompts/prompts";
import {
  HealthRecordType,
  HealthRecordUpdateType,
  Z_HealthRecord,
  Z_HealthRecordUpdate,
} from "../models/health-record/healthRecordValidation";
import { Conversation } from "../routes/healthRecords.routes";
import { indexToNatural } from "../utils/helpers";
import { textGen } from "./genAI";

interface ValidationHelathRecordReturn {
  success: boolean;
  systemPrompt?: string;
  assistantPrompt?: string;
  validationErrors?: Array<{ field: string; message: string }>;
}

const MINIMUM_SYMPTOMS = 2;

export async function validateHealthRecord(
  healthRecord: Partial<HealthRecordType> | Partial<HealthRecordUpdateType>,
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

  const { additionalSymptoms, treatmentsTried, medicalConsultations, followUps } = conversation.requestedData;

  try {
    const validatedRecord = isUpdate ? Z_HealthRecordUpdate.parse(healthRecord) : Z_HealthRecord.parse(healthRecord);
    console.log("Validation successful!");

    if (!additionalSymptoms && validatedRecord.symptoms.length < MINIMUM_SYMPTOMS) {
      conversation.requestedData.additionalSymptoms = true;
      return {
        success: true,
        assistantPrompt: prompts.assistant.symptoms,
        systemPrompt: prompts.system.symptoms(validatedRecord as Partial<HealthRecordType>),
      };
    }
    if (!treatmentsTried && !validatedRecord.treatmentsTried.length) {
      conversation.requestedData.treatmentsTried = true;
      return {
        success: true,
        assistantPrompt: prompts.assistant.treatments,
        systemPrompt: prompts.system.treatments(validatedRecord as Partial<HealthRecordType>),
      };
    }
    if (!medicalConsultations && !validatedRecord.medicalConsultations.length) {
      conversation.requestedData.medicalConsultations = true;
      return {
        success: true,
        assistantPrompt: prompts.assistant.consultations,
        systemPrompt: prompts.system.consultations(validatedRecord as Partial<HealthRecordType>),
      };
    }

    const consultationIndex = validatedRecord.medicalConsultations.findIndex((consultation, index) => {
      // Skip if we already prompted for follow-ups or user provided them
      if (followUps[index]) return false;

      // If consultation has follow-ups, mark it tracked and skip
      if (consultation.followUpActions.length) {
        followUps[index] = true;
        return false;
      }
      // Found a consultation without follow-ups that needs prompting
      return true;
    });

    if (consultationIndex !== -1) {
      followUps[consultationIndex] = true;
      const consultationOrder =
        validatedRecord.medicalConsultations.length > 1 ? indexToNatural(consultationIndex) : "";
      return {
        success: true,
        assistantPrompt: prompts.assistant.followUps(consultationOrder),
        systemPrompt: prompts.system.followUps(validatedRecord as Partial<HealthRecordType>, consultationIndex),
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
