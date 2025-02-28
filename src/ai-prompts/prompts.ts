export default {
  init: `
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
    }`,
  symptoms: {
    assistant: "You provided only one symptom, do you have more sympotms that can be added to the record.",
    system: "Extract any additional symptoms detected and add them to the array.",
  },
  treatments: {
    assistant: "Have you tried any treatments by yourself to deal with your condition?",
    system: "Extract any tried treatments provide by the user",
  },
  consultaions: {
    assistant:
      "Have you had any consultations about your current condition? If so, could you share the name of the consultant, the date of the consultation, the diagnosis, and any follow-up actions recommended?",
    system: `
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
      }`,
  },
  validation:
    "Generate a user friendly prompt starting with the below and leveraging the error messages resulting from validation of the previous input. Please provide the following information to complete the health record:",
};
