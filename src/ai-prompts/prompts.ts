import { HealthRecordType } from "../models/health-record/healthRecordValidation";

export default {
  system: {
    init: `
      Based on the user description, generate a JSON object that accurately matches the Zod schema.
      - For "description": summarize, clean up, and correct mistakes before adding it to the JSON. Do not include any placeholder text, meaningless phrases or unrelated information in the description.
      - For fields "status", "improvementStatus", and "severity", interpret the description and select a value from their respective accepted options. These fields have default values and are not required, so if the information is not clearly present, use the default values.
      - For "symptoms": extract at least one symptom **only if** it is clearly related to a medical or physical condition. If multiple unrelated symptoms are mentioned, create separate entries rather than grouping them. If no valid symptoms are found, leave the field empty.
      - Extract only clear, medically relevant details from the user's input. Disregard any vague, unrelated, non-medical, or ambiguous information.
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

      const HealthRecord = z.object({
        description: z.string().trim().min(2).max(MAX_CHAR_LONG),
        symptoms: z.array(Symptoms).min(1),
        status: z.enum(STATUS_TYPES).default("open"),
        treatmentsTried: z.array(z.string().trim().min(2).max(MAX_CHAR_LONG)).default([]),
        improvementStatus: z.enum(IMPROVEMENT_STATUS).default("stable"),
        severity: z.enum(SEVERITY_TYPES).default("variable"),
      });

      Expected JSON Output structure:
      {
        "description": "",
        "symptoms": [{name: ""}],
        "treatmentsTried": [],
        "improvementStatus": "",
        "severity": "",
        "status": ""
      }
    `,
    treatments: (currentRecord: Partial<HealthRecordType>) => `
    This was your output, update it to iclude the new requirements.
    Don't update single value entries that were already generated if not needed:
    ${JSON.stringify(currentRecord)}

    - Extract any tried treatments provided by the user. If treatments are not mentioned, leave the field empty.
    - Do not force extraction if the information is not clearly present
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
    consultaions: (currentRecord: Partial<HealthRecordType>) => `
      Based on the user input, extract the relevant information about the consultations and append them to the "medicalConsultations" array within the Current HealthRecord object.
      - Retain all the data already existing in the current health record.
      - Focus on extracting and appending the following consultation details:
        - consultant: Extract the name of the consultant.
        - date: Extract the date of the consultation.
        - diagnosis: Summarize and clean up the diagnosis provided.
        - followUpActions: Extract any follow-up actions recommended. If there are multiple, list them separately.
      - If data is missing, leave fields empty. Ignore missing details.

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
        "improvementStatus": "${currentRecord.improvementStatus}",
        "severity": "${currentRecord.severity}",
        "status": "${currentRecord.status}",
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
        "improvementStatus": "${currentRecord.improvementStatus}",
        "severity": "${currentRecord.severity}",
        "status": "${currentRecord.status}",
        "medicalConsultations": ${JSON.stringify(currentRecord.medicalConsultations)},
      }
    `,
  },
  assistant: {
    consultations:
      "Have you had any consultations regarding your current condition? If so, please provide the name of the consultant, the date of the consultation, the diagnosis, and any follow-up actions recommended.",
    symptoms:
      "You mentioned only one symptom. Are there any additional symptoms you would like to add to your health record?",
    treatments: "Have you tried any treatments on your own to manage your condition? If yes, please share the details.",
  },
};
