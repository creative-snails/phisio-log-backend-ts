import { ZodError } from "zod";
import prompts from "../ai-prompts/prompts";
import { MIN_CHAR_MEDIUM } from "../models/health-record/healthRecordService";
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
  // Never allow 'updates' to be set via the main create/update flows
  if (!isUpdate && (healthRecord as { updates?: unknown }).updates) {
    delete (healthRecord as { updates?: unknown }).updates;
  }
  // Convert dates to valid dates before handing over to validation
  if (healthRecord.symptoms?.length) {
    healthRecord.symptoms = healthRecord.symptoms?.map((symptom) => ({
      ...symptom,
      startDate: symptom.startDate ? new Date(symptom.startDate) : undefined,
    }));
  }

  if (healthRecord.medicalConsultations?.length) {
    const now = new Date();
    healthRecord.medicalConsultations = healthRecord.medicalConsultations
      .map((consultation) => {
        const parsedDate = (consultation as { date?: string | number | Date }).date
          ? new Date((consultation as { date: string | number | Date }).date)
          : undefined;
        const isFuture = parsedDate instanceof Date && parsedDate.getTime() > now.getTime();
        if (isFuture) {
          // Planned consultation: keep consultant and date; drop diagnosis but preserve follow-ups if present
          return {
            ...consultation,
            date: parsedDate,
            diagnosis: undefined,
          } as typeof consultation;
        }
        return { ...consultation, date: parsedDate };
      })
      // Drop entries with no consultant at all
      .filter((c) => Boolean((c as { consultant?: string }).consultant?.trim()));
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

      const missingFieldsRaw = validationErrors
        .filter((err) => err.message.includes("Required"))
        .map((err) => err.field)
        // Do not surface 'status' to users because defaults are applied in prompts and schema usage
        .filter((field) => field !== "status");

      const invalidFields = validationErrors
        .filter((err) => !err.message.includes("Required"))
        .map((err) => `${err.field} (${err.message})`);

      // Helpful hints for commonly-missed fields
      const hintForMissing = (field: string) => {
        if (field === "description") return `description (min ${MIN_CHAR_MEDIUM} characters)`;
        if (field === "symptoms") return "symptoms (at least 1 item)";
        return field;
      };

      const missingFields = missingFieldsRaw.map(hintForMissing);

      if (missingFields.length) {
        validationPrompt += "\nMissing:\n";
        missingFields.forEach((field) => (validationPrompt += `- ${field}\n`));
      }

      if (invalidFields.length) {
        validationPrompt += "\nInvalid:\n";
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
