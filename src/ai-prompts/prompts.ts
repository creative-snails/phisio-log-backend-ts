import { HealthRecordType } from "../models/health-record/healthRecordValidation";
import { indexToNatural } from "../utils/helpers";

export default {
  system: {
    init: `
      You extract structured health records as a single JSON object. Follow these strict rules to avoid hallucinations:

      Output contract (JSON only, no prose):
      {
        "description": string,
        "symptoms": Array<{ name: string, startDate?: string }>,
        "status": { stage: string, severity: string, progression: string },
        "treatmentsTried"?: string[],
        "medicalConsultations"?: Array<{ consultant: string, date: string, diagnosis: string, followUpActions?: string[] }>
      }

      Extraction rules:
      - Extract only clear, medically relevant details explicitly stated by the user. Do not infer or guess.
      - Description: concise cleaned summary of the medical content only (no placeholders, jokes, chit-chat, or unrelated info).
      - Symptoms: include only symptoms clearly mentioned. Separate unrelated symptoms. If startDate is unclear, omit it.
      - Dates: use ISO format YYYY-MM-DD. Never set future dates. If not clearly provided, omit the date field.
      - Status (enums, exact strings):
        • stage: one of ["open", "closed", "in-progress"]
        • severity: one of ["mild", "moderate", "severe", "variable"]
        • progression: one of ["improving", "stable", "worsening", "variable"]
        Always include the status object. If no value is clearly implied, use defaults: stage="open", severity="variable", progression="variable".
      - Treatments/consultations: include only if explicitly mentioned; otherwise omit or use empty arrays.
      - Multiple user messages: merge medically relevant facts across all user messages; the latest user message overrides earlier contradictions.
      - Do not invent fields or values. If a field is not clearly provided and has no default, omit it.
    `,
    treatments: (currentRecord: Partial<HealthRecordType>) => `
      Append user-tried treatments to the current record. Output a single JSON object only (no prose).

      Output contract:
      {
        "description": string,
        "symptoms": Array<{ name: string, startDate?: string }>,
        "status": { stage: string, severity: string, progression: string },
        "treatmentsTried": string[],
        "medicalConsultations"?: Array<{ consultant: string, date: string, diagnosis: string, followUpActions?: string[] }>
      }

      Rules:
      - Preserve all existing fields from currentRecord. Only append clearly stated treatments the user has already tried (e.g., "I took ibuprofen").
      - Do NOT include recommendations or plans (e.g., "doctor recommended" or "will try" do not belong here).
      - Normalize: trim strings and deduplicate case-insensitively.
      - If no treatments are mentioned, keep the array as-is (or use an empty array if absent). Do not invent items.
      - Do not alter status, symptoms, or consultations unless explicitly updated by the user.

      currentRecord:
      ${JSON.stringify(currentRecord)}

      Output JSON only; do not invent values; apply the rules strictly.
    `,
    symptoms: (currentRecord: Partial<HealthRecordType>) => `
      Append clearly stated additional symptoms to the current record. Output a single JSON object only (no prose).

      Output contract:
      {
        "description": string,
        "symptoms": Array<{ name: string, startDate?: string }>,
        "status": { stage: string, severity: string, progression: string },
        "treatmentsTried"?: string[],
        "medicalConsultations"?: Array<{ consultant: string, date: string, diagnosis: string, followUpActions?: string[] }>
      }

      Rules:
      - Preserve all existing fields. Only add symptoms that are explicitly and clearly mentioned.
      - Separate unrelated symptoms into distinct entries; do not group.
      - Dates: use ISO YYYY-MM-DD if explicitly provided; never future dates; omit if unclear.
      - Ignore non-medical content and vague/ambiguous statements; do not guess symptoms.
      - If no new symptoms are present, keep the array unchanged.

      currentRecord:
      ${JSON.stringify(currentRecord)}

      Output JSON only; do not invent values; apply the rules strictly.
    `,
    validation: `
      Write a brief, supportive message guiding the user to fix validation issues. Keep it under 80 words.

      Rules:
      - Start with: "Please provide the following to complete your health record:".
      - If there are missing required fields, list them under "Missing:" as bullet points.
      - If there are invalid fields, list them under "Invalid:" as bullet points with a short reason per item.
      - Be polite, specific, and neutral. Do not offer medical advice. Do not invent fields.
      - Plain text only (no JSON, no code fences).
    `,
    consultations: (currentRecord: Partial<HealthRecordType>) => `
      You append medically relevant consultations to currentRecord.medicalConsultations. Output JSON only (no prose) with this shape:

      {
        "description": string,
        "symptoms": Array<{ name: string, startDate?: string }>,
        "status": { stage: string, severity: string, progression: string },
        "treatmentsTried"?: string[],
        "medicalConsultations": Array<{ consultant: string, date: string, diagnosis: string, followUpActions?: string[] }>
      }

      Rules:
      - Start from the given currentRecord (do not alter existing fields or entries unless the user clearly corrects them).
      - Extract consultations only if explicitly stated. If multiple are mentioned, add one entry per consultation.
      - Fields:
        • consultant: include name and role if provided (e.g., "Dr. Smith, cardiologist").
        • date: use ISO YYYY-MM-DD; never future dates; omit if unclear.
        • diagnosis: include only the diagnosis, not advice.
        • followUpActions: list recommended actions (treatments, appointments, care). If none, use an empty array.
      - Do not infer or fabricate information. Omit fields that are not clearly provided.
      - Status enums must remain one of: stage ["open","closed","in-progress"], severity ["mild","moderate","severe","variable"], progression ["improving","stable","worsening","variable"]. If unclear, keep existing values.

      currentRecord:
      ${JSON.stringify(currentRecord)}

      Output JSON only; do not invent values; apply the rules strictly.
    `,
    followUps: (currentRecord: Partial<HealthRecordType>, consultationIndex: number) => `
      This is your output, update it to include the new requirements.
      Don't update single value entries that were already generated if not needed:
      ${JSON.stringify(currentRecord)}

      Identify and extract any follow-up actions mentioned by the user. Add them only to the "followUpActions" array for the ${indexToNatural(consultationIndex)} consultation.
      - Even if the user does not explicitly mention a follow-up action, extract any information that implies follow-up care such as appointments, treatments, or recommendations.
      - If multiple follow-up actions are mentioned, create a new entry for each one in the "followUpActions" array.
      - If no follow-up actions are mentioned, leave the array empty.
      - Assume that, if a follow-up action was already prompted for and remains empty, the user intentionally left it that way.
    `,
    update: (currentRecord: Partial<HealthRecordType>) => `
      Update an existing health record by merging new user input into the current record. Output a single JSON object only (no prose).

      Output contract:
      {
        "description": string,
        "symptoms": Array<{ name: string, startDate?: string }>,
        "status": { stage: string, severity: string, progression: string },
        "treatmentsTried"?: string[],
        "medicalConsultations"?: Array<{ consultant: string, date: string, diagnosis: string, followUpActions?: string[] }>,
        "updates"?: Array<any>
      }

      Merge rules:
      - Start from currentRecord. Only change a field if the user clearly updated or contradicted it; otherwise keep existing values.
      - Description: produce a concise, cleaned summary combining prior content with any new medically relevant details.
      - Symptoms: append clearly stated new symptoms. Do not remove existing symptoms unless the user explicitly retracts them. Omit startDate if unclear.
      - Status (enums, exact strings):
        • stage in ["open","closed","in-progress"],
        • severity in ["mild","moderate","severe","variable"],
        • progression in ["improving","stable","worsening","variable"].
        If no change is clearly implied, keep currentRecord values; if absent and unclear, use defaults stage="open", severity="variable", progression="variable".
      - Treatments: append clearly mentioned items; deduplicate by case-insensitive string match.
      - Consultations: append new consultations only when explicitly provided; preserve existing entries and their followUpActions unless the user clearly updates them.
      - Dates: use ISO YYYY-MM-DD. Never set future dates. Omit date fields if not clearly provided.
      - Multiple user messages: merge facts; the latest message overrides earlier contradictions.
      - Do not invent fields or values. If a field is not clearly provided and has no default, omit it.

      currentRecord:
      ${JSON.stringify(currentRecord)}

      Output JSON only; do not invent values; apply the rules strictly.
    `,
  },
  assistant: {
    consultations:
      "Have you had any medical consultations for this condition? If yes, for each visit share: consultant (e.g., 'Dr. Smith, cardiologist'), date (YYYY-MM-DD), diagnosis, and any follow-up actions (tests, medications, appointments). One consultation per line is fine.",
    followUps: (consultationOrder: string) =>
      `Did your consultant${
        consultationOrder ? ` for the ${consultationOrder} consultation` : ""
      } recommend any follow-up actions (e.g., tests, medications, lifestyle changes, appointments)? Please list them. If none, say "none".`,

    symptoms:
      "You mentioned only one symptom. Are there any others to add? List each symptom separately (e.g., 'headache', 'nausea'). Dates are optional; if unsure, skip them.",
    treatments:
      "Have you already tried any treatments for this condition (e.g., ibuprofen, ice, rest)? List only what you've already done—exclude plans or doctor recommendations.",
  },
};
