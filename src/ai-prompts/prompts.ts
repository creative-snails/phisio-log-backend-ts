import { HealthRecordType } from "../models/health-record/healthRecordValidation";
import { indexToNatural } from "../utils/helpers";

export default {
  system: {
    init: `
      Based on the user description, generate a JSON object that accurately matches the Zod schema.
      - For "description": summarize, clean up, and correct mistakes before adding it to the JSON. Do not include any placeholder text, meaningless phrases or unrelated information in the description.
      - For fields "status", "improvementStatus", and "severity", interpret the description and select a value from their respective accepted options. These fields have default values and are not required, so if the information is not clearly present, use the default values.
      - For "symptoms": extract all symptoms that are clearly stated. Do not create symptoms based on context, implied meaning, or logical assumptions. If multiple unrelated symptoms are mentioned, create separate entries rather than grouping them. If no symptoms are mentioned, leave the array empty.
      - Extract only clear, medically relevant details from the user's input. Disregard any vague, unrelated, non-medical, or ambiguous information.
      - If any required fields are missing and have no default in the Zod schema, leave those fields empty.
      - Be aware that today's date is ${new Date()}. Ensure no future dates are assigned to any date field.
      - When multiple "user" messages exist in the conversation history, integrate the medically relevant information from all messages according to the extraction and formatting guidelines to generate unified JSON object.
      - Summarize and clean up all extracted data, correcting typos and inconsistent phrasing before adding it to the final JSON.

      Zod Schema
      const MAX_CHAR_SHORT = 100;
      const MAX_CHAR_MEDIUM = 1000;
      const MAX_CHAR_LONG = 10_000;

      const MIN_CHAR_SHORT = 2;
      const MIN_CHAR_MEDIUM = 10;
      const MIN_CHAR_LONG = 50;

      const STAGE_TYPES = ["open", "closed", "in-progress"] as const;
      const SEVERITY_TYPES = ["mild", "moderate", "severe", "variable"] as const;
      const PROGRESSION_TYPES = ["improving", "stable", "worsening", "variable"] as const;

      const Stage = z.enum(STAGE_TYPES);
      const Severity = z.enum(SEVERITY_TYPES);
      const Progression = z.enum(PROGRESSION_TYPES);

      const Status = z.object({
        stage: Stage,
        severity: Severity,
        progression: Progression,
      });

      const Description = z
        .string()
        .min(MIN_CHAR_MEDIUM, minValidationMessage("Description", MIN_CHAR_MEDIUM))
        .max(MAX_CHAR_LONG, maxValidationMessage("Description", MAX_CHAR_LONG));

      const Symptom = z.object({
        name: z
          .string()
          .trim()
          .min(MIN_CHAR_SHORT, minValidationMessage("Symptom", MIN_CHAR_SHORT))
          .max(MAX_CHAR_MEDIUM, maxValidationMessage("Symptom", MAX_CHAR_MEDIUM)),
        startDate: z.date().optional(),
      });

      const MedicalConsultation = z.object({
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

      const HealthRecordUpdate = z.object({
        description: Description.optional(),
        symptoms: z.array(Z_Symptom).optional().default([]),
        status: Status.optional(),
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
          .array(MedicalConsultation)
          .max(10, "You can only have up to 10 medical consultations.")
          .optional()
          .default([]),
      });

      const HealthRecord = z.object({
        description: Description,
        symptoms: z.array(Symptom).min(1),
        status: z.enum(STATUS_TYPES).default("open"),
        status: Status,
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
          .array(MedicalConsultation)
          .max(10, "You can only have up to 10 medical consultations.")
          .optional()
          .default([]),
        updates: z.array(HealthRecordUpdate).optional().default([]),
        createdAt: z.date().optional(),
        updatedAt: z.date().optional(),
      });

      Expected JSON Output structure:
      {
        "description": "",
        "symptoms": [{name: ""}],
        "treatmentsTried": [],
        "status": {
          "progression": "",
          "severity": "",
          "stage": "",
        }
      }
    `,
    treatments: (currentRecord: Partial<HealthRecordType>) => `
    This was your output, update it to iclude the new requirements.
    Don't update single value entries that were already generated if not needed:
    ${JSON.stringify(currentRecord)}

    - Extract any tried treatments provided by the user. If treatments are not mentioned, leave the field empty.
    - Do not force extraction if the information is not clearly present.
    `,
    symptoms: (currentRecord: Partial<HealthRecordType>) => `
      This was your output, update it to iclude the new requirements.
      Don't update single value entries that were already generated if not needed:
      ${JSON.stringify(currentRecord)}

      Extract any additional symptoms detected and add them to the array.
      - If no additional symptoms are found, leave the array as is.
      - Do not force extraction if the information is not clearly present.
      - Do not generate a start date, that will be handled by the database.
      - Only extract symptoms if they are clearly related to a medical or physical condition. Ignore general statements or non-medical information.
      `,
    validation: `
      Generate a user-friendly message using the error messages resulting from the validation of the previous input. Start with the following prompt and ensure the message is clear and helpful for the user:
      'Please provide the following information to complete the health record:'
      Use the validation errors to guide the user on what specific information is missing or incorrect. Ensure the message is polite, clear, and supportive.
    `,
    consultations: (currentRecord: Partial<HealthRecordType>) => `
      Based on the user input, extract **only medically relevant consultation information** and append it to the "medicalConsultations" array within the current health record.

      Rules:
      - Keep all data already present in the current health record unchanged.
      - Do not assume or fabricate information — extract only what is stated.
      - Leave any missing fields empty.
      - If the user mentions multiple consultations, create a new entry for each one in the "medicalConsultations" array.

      For each consultation, extract the following:
      1. **consultant**: The name along with any relevant details about the consultant (e.g., "Dr. Smith, cardiologist").
      2. **date**: The date the consultation occurred.
      3. **diagnosis**: Include only the medical condition(s) diagnosed by the consultant. Do not include any advice or follow-up actions in this field.
      4. **followUpActions**:
        - Extract all follow-up actions recommended by the consultant, including treatments, scheduled appointments, care recommendations, and any other instructions related to ongoing or future care.
        - If multiple are mentioned, create a new entry for each one in the array.

      Clean up and summarize the extracted data, correcting any typos or inconsistent phrasing before adding it to the final JSON.

      Zod Schema
      const Z_MedicalConsultation = z.object({
        consultant: z.string().trim().min(2).max(MAX_CHAR_SHORT),
        date: z.date().max(new Date(), "Consultation date cannot be in the future"),
        diagnosis: z.string().trim().min(1, "Diagnosis is required").max(MAX_CHAR_LONG),
        followUpActions: z.array(z.string().trim().min(2).max(MAX_CHAR_LONG)).default([]),
      });

      Expected JSON Output structure that you will add to the "medicalConsultations" array:
      {
        "description": "${currentRecord.description}",
        "symptoms": ${JSON.stringify(currentRecord.symptoms)},
        "treatmentsTried": ${JSON.stringify(currentRecord.treatmentsTried)},
        "status": {
          "progression": "${currentRecord.status?.progression}",
          "severity": "${currentRecord.status?.severity}",
          "stage": "${currentRecord.status?.stage}"
        },
        "medicalConsultations": [
          ...${JSON.stringify(currentRecord.medicalConsultations)},
          {
            "consultant": "",
            "date": "",
            "diagnosis": "",
            "followUpActions": []
          }
        ]
      }
    `,
    followUps: (currentRecord: Partial<HealthRecordType>, consultationIndex: number) => `
      This is your output, update it to iclude the new requirements.
      Don't update single value entries that were already generated if not needed:
      ${JSON.stringify(currentRecord)}

      Identify and extract any follow-up actions mentioned by the user. Add them only to the "followUpActions" array for the ${indexToNatural(consultationIndex)} consultation.
      - Even if the user does not explicitly mention a follow-up action, extract any information that implies follow-up care such as appointments, treatments, or recommendations.
      - If multiple follow-up actions are mentioned, create a new entry for each one in the "followUpActions" array.
      - If no follow-up actions are mentioned, leave the array empty.
      - Assume that, if a follow-up action was already prompted for and remains empty, the user intentionally left it that way.
    `,
    update: (currentRecord: Partial<HealthRecordType>) => `
      Based on the user's description and the conversation history, generate a JSON object that accurately matches the Zod schema.
      - Merge the existing "description" from the health record with any new, valid, and medically relevant information from the user's input and conversation history into one clear, corrected summary.
      - For fields that have predefined defaults (status, improvementStatus, severity):
          → interpret the user's input carefully.
          → if the user does not clearly mention or imply an update, retain the existing value or use the default if no prior data is available.
      - Extract only clear, medically relevant details from the user's input. Disregard any vague, unrelated, non-medical, nonsensical content (such as placeholder text, jokes, unrelated comments, or generic statements) or ambiguous information.
      - If any required fields are missing and have no default in the Zod schema, leave those fields empty.
      - Be aware that today's date is ${new Date()}. Ensure no future dates are assigned to any date field.
      - Summarize and clean up all extracted data, correcting typos and inconsistent phrasing before adding it to the final JSON.

      Zod Schema
      const IMPROVEMENT_STATUS = ["improving", "stable", "worsening", "variable"] as const;
      const SEVERITY_TYPES = ["mild", "moderate", "severe", "variable"] as const;
      const Symptoms = z.object({
        name: z.string().trim().min(1).max(MAX_CHAR_MEDIUM),
        startDate: z.date().max(new Date()),
      });
      const MedicalConsultation = z.object({
        consultant: z.string().trim().min(2).max(MAX_CHAR_SHORT),
        date: z.date().max(new Date(), "Consultation date cannot be in the future"),
        diagnosis: z.string().trim().min(1, "Diagnosis is required").max(MAX_CHAR_LONG),
        followUpActions: z.array(z.string().trim().min(2).max(MAX_CHAR_LONG)).default([]),
      });
      const HealthRecord = z.object({
        description: z.string().trim().min(2).max(MAX_CHAR_LONG),
        symptoms: z.array(Symptoms).min(1),
        status: z.enum(STATUS_TYPES).default("open"),
        treatmentsTried: z.array(z.string().trim().min(2).max(MAX_CHAR_LONG)).default([]),
        improvementStatus: z.enum(IMPROVEMENT_STATUS).default("stable"),
        severity: z.enum(SEVERITY_TYPES).default("variable"),
        medicalConsultations: z.array(MedicalConsultation)
      });

      Expected JSON Output structure including existing data:
      {
        "description": "${currentRecord.description}",
        "symptoms": ${JSON.stringify(currentRecord.symptoms)},
        "treatmentsTried": ${JSON.stringify(currentRecord.treatmentsTried)},
        "progression": "${currentRecord.status?.progression}",
        "severity": "${currentRecord.status?.severity}",
        "stage": "${currentRecord.status?.stage}",
        "medicalConsultations": ${JSON.stringify(currentRecord.medicalConsultations)},
      }
    `,
  },
  assistant: {
    consultations:
      "Have you had any consultations regarding your current condition? If so, please provide the name of the consultant, the date of the consultation, the diagnosis, and any follow-up actions recommended.",
    followUps: (consultationOrder: string) =>
      `Have you had any follow-up actions recommended by your consultant${
        consultationOrder ? ` for the ${consultationOrder} consultation` : ""
      }? If so, please provide the details.`,

    symptoms:
      "You mentioned only one symptom. Are there any additional symptoms you would like to add to your health record?",
    treatments: "Have you tried any treatments on your own to manage your condition? If yes, please share the details.",
  },
};
