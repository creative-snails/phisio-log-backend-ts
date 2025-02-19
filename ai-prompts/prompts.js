"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newSystemPrompt = exports.systemPrompt = exports.userPrompt = exports.extractInitialPropmt = exports.initialPrompt = void 0;
const healthRecordService_1 = require("../models/health-record/healthRecordService");
exports.initialPrompt = "Please describe your health situation. You can mention symptoms, treatments you've tried, severity, or anything else you think is important.";
exports.extractInitialPropmt = "Extract the health record information, igonre the updates section since this is the first input";
exports.userPrompt = "I have some pain in the neck and in the shoulders and I think it was due to some old injury and probably unhealthy sitting positions and maybe also lack of workout so I have been trying to go to the gym more often and do some stretches and it's been improving but it's never gone so sometimes it's strong and sometimes it is more bearable so usually I feel I find it hard to stand up because I feel like my body is leaning to one side more than the other so I'm constantly trying to find some balance and that's very exhausting with time even when I'm sleeping I feel like I have one side that is stronger than the other";
const enumPrompt = (enumValues) => {
    return `conclude the best match and chose from the propsed values: ${enumValues.toString()}`;
};
exports.systemPrompt = `
      Based on the user's input, generate a JSON object with the following structure:
      where the valus is indicated as enum, conclude the best match and chose from the propsed values.

    {
      "description":  "",
      "symptoms": [
          {
            "name": "${enumPrompt([...healthRecordService_1.STATUS_TYPES])}",
            "startDate": "",
            "duration": ""
          }
        ],
      "status": "${enumPrompt([...healthRecordService_1.IMPROVEMENT_STATUS])}",
      "treatmentsTried": ["Treatment 1", "Treatment 2"],
      "improvementStatus": "",
      "medicalConsultations": [
          {
            "consultant": "",
            "date": "",
            "diagnosis": "",
            "followUpActions": ["Action 1", "Action 2"]
          }
        ],
      "severity": "${enumPrompt([...healthRecordService_1.SEVERITY_TYPES])}"
    }

    If a value was not provided keep the value empty.
    `;
exports.newSystemPrompt = `
  Based on the user description, generate a JSON object matching the Zod schema.
  - For fields: status, treatmentsTried, and severity, interpret the description and pick a value from their respective accepted values.
  - symptoms: Extract at least one symptom. If the symptoms are not similar, don't group them, create separate entries instead.
  - description: Summarize, clean up, and fix any mistakes before adding it to the JSON.
  - If data is missing, leave fields empty. Ignore missing details.
  - Be aware that today's date is ${new Date()}

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
    "improvementStatus": "",
    "severity": ""
  }
  `;
