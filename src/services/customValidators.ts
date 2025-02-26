import { ZodError } from "zod";
import { consultationsPrompt } from "../ai-prompts/prompts";
import { HealthRecordType, Z_HealthRecord } from "../models/health-record/healthRecordValidation";
import { textGen } from "./genAI";

interface ValidationHelathRecordReturn {
  success: boolean;
  systemPrompt?: string;
  assistantPrompt?: string;
  validationErrors?: Array<{ field: string; message: string }>;
}

const MINIMUM_SYMPTOMS = 2;

export async function validateHealthRecord(
  healthRecord: Partial<HealthRecordType>
): Promise<ValidationHelathRecordReturn> {
  // Convert dates to valid dates before handing over to validation
  healthRecord.symptoms = healthRecord.symptoms?.map((symptom) => ({
    ...symptom,
    startDate: symptom.startDate ? new Date(symptom.startDate) : new Date(),
  }));

  healthRecord.medicalConsultations?.map((consultation) => ({
    ...consultation,
    date: consultation.date ? new Date(consultation.date) : new Date(),
  }));

  try {
    const validatedRecord = Z_HealthRecord.parse(healthRecord);
    console.log("Validation successful!");

    if (validatedRecord.symptoms.length < MINIMUM_SYMPTOMS) {
      return {
        success: true,
        systemPrompt: "Extract any additional symptoms detected and add them to the array.",
        assistantPrompt: "You provided only one symptom, do you have more sympotms that can be added to the record.",
      };
    }
    if (!validatedRecord.treatmentsTried.length) {
      return {
        success: true,
        systemPrompt: "Extract any tried treatments provide by the user",
        assistantPrompt: "Have you tried any treatments by yourself to deal with your condition?",
      };
    }
    if (!validatedRecord.medicalConsultations.length) {
      return {
        success: true,
        systemPrompt: consultationsPrompt,
        assistantPrompt:
          "Have you had any consultations about your current condition? If so, could you share the name of the consultant, the date of the consultation, the diagnosis, and any follow-up actions recommended?",
      };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof ZodError) {
      let validationPrompt = "";

      const validationErrors = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      const missingFields = validationErrors.filter((err) => err.message.includes("Required")).map((err) => err.field);
      const invalidFields = validationErrors
        .filter((err) => !err.message.includes("Required"))
        .map((err) => `${err.field} (${err.message})`);

      validationPrompt += `Generate a user friendly prompt starting with the below and leveraging
                         the error messages resulting from validation of the previous input.
                        Please provide the following information to complete the health record:`;

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
