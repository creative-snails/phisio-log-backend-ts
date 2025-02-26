import { ZodError } from "zod";
import { consultationsPrompt, userPrompt } from "../ai-prompts/prompts";
import { HealthRecordType, Z_HealthRecord } from "../models/health-record/healthRecordValidation";
import { Message, textGen } from "./genAI";

interface ValidationHelathRecordReturn {
  success: boolean;
  systemPrompt?: string;
  userPrompt?: string;
  validationErrors?: Array<{ field: string; message: string }>;
}

export async function validateHealthRecord(
  healthRecord: Partial<HealthRecordType>,
  history: Message[]
): Promise<ValidationHelathRecordReturn> {
  let validationPrompt = "";
  let systemPrompt = "";
  let newUserPrompt = userPrompt;

  healthRecord.symptoms?.forEach((s) => {
    if (s.startDate) s.startDate = new Date(s.startDate);
    else delete s.startDate;
  });

  healthRecord.medicalConsultations?.forEach((c) => {
    if (c.date) c.date = new Date(c.date);
  });

  try {
    Z_HealthRecord.parse(healthRecord);
    console.log("Validation successful!");
    return { success: true };
  } catch (error) {
    if (error instanceof ZodError) {
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

      newUserPrompt = await textGen([{ role: "user", content: validationPrompt }]);

      return {
        success: false,
        validationErrors,
        userPrompt: newUserPrompt,
      };
    }
  }

  if (history.length > 2) {
    if ((healthRecord.symptoms?.length ?? 0) <= 1) {
      newUserPrompt = "You provided only one symptom, do you have more sympotms that can be added to the record.";
      systemPrompt = "Extract any additional symptoms detected and add them to the array.";

      return { success: true, systemPrompt, userPrompt: newUserPrompt };
    }
    if (!healthRecord.treatmentsTried?.length) {
      newUserPrompt = "Have you tried any treatments by yourself to deal with your condition?";
      systemPrompt = "Extract any tried treatments provide by the user";

      return { success: true, systemPrompt, userPrompt: newUserPrompt };
    }
    if (!healthRecord.medicalConsultations?.length) {
      newUserPrompt =
        "Have you had any consultations about your current condition? If so, could you share the name of the consultant, the date of the consultation, the diagnosis, and any follow-up actions recommended?";
      return { success: true, systemPrompt: consultationsPrompt, userPrompt: newUserPrompt };
    }
  }

  return {
    success: false,
  };
}
