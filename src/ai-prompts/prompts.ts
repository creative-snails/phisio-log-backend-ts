export const initialAssistantPrompt =
  "Please describe your health situation. You can mention symptoms, treatments you've tried, severity, or anything else you think is important.";

export const initialSystemPrompt = `
  Based on the user description, generate a JSON object matching the Zod schema.
  - For fields: status, treatmentsTried, and severity, interpret the description and pick a value from their respective accepted values.
  - symptoms: Extract at least one symptom. If the symptoms are not similar, don't group them, create separate entries instead.
  - description: Summarize, clean up, and fix any mistakes before adding it to the JSON.
  - If data is missing, leave fields empty. Ignore missing details.
  - Be aware that today's date is ${new Date()}
  - Only extract symptoms if they are clearly related to a medical or physical condition. Ignore general statements or non-medical information.

  Zod Schema
  const IMPROVEMENT_STATUS = ["improving", "stable", "worsening", "variable"] as const;
  const SEVERITY_TYPES = ["mild", "moderate", "severe", "variable"] as const;

  const Symptoms = z.object({
    name: z.string().trim().min(1).max(MAX_CHAR_MEDIUM),
    startDate: z.date().max(new Date()),
  });

  export const HealthRecord = z.object({
    description: z.string().trim().min(2).max(MAX_CHAR_LONG),
    symptoms: z.array(Symptoms).min(1),
    status: z.enum(STATUS_TYPES).default("open"),
    treatmentsTried: z.array(z.string().trim().min(2).max(MAX_CHAR_LONG)).default([]),
    improvementStatus: z.enum(IMPROVEMENT_STATUS).default("stable"),
    severity: z.enum(SEVERITY_TYPES),
  });

  Expected JSON Output sturcture:
  {
    "description": "",
    "symptoms": [
      {
        name: "",
        startDate: ",
      }
    ],
    "treatmentsTried": [],
    "medicalConsultations": [],
    "improvementStatus": "",
    "severity": ""
  }
  `;

export const consultationsPrompt = `
  Based on the user input, extract the relavent information about the consultations and append them to the "medicalConsultations" array within the main health record object.
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
    "consultant": "",
    "date": "",
    "diagnosis": "",
    "followUpActions": []
  }
  `;
