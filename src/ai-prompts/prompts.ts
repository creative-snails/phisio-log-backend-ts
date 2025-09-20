import { HealthRecordType } from "../models/health-record/healthRecordValidation";
import { indexToNatural } from "../utils/helpers";

// Reference date used to resolve relative date phrases like "today", "yesterday", or "3 days ago".
// Computed in UTC once at module load to keep behavior stable within a single server run.
const REFERENCE_DATE = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

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
  "medicalConsultations"?: Array<{ consultant: string, date?: string, diagnosis?: string, followUpActions?: string[] }>
      }

      Extraction rules:
      - Extract only clear, medically relevant details explicitly stated by the user. Do not infer or guess.
      - Description: concise cleaned summary of the medical content only (no placeholders, jokes, chit-chat, or unrelated info).
      - Symptoms: include only symptoms clearly mentioned. Use concise medical nouns (e.g., "dizziness", not "mild dizziness"). Remove qualifiers (mild/moderate/severe/very/today/yesterday/durations). If a qualifier implies severity, set status.severity accordingly. Separate unrelated symptoms. If startDate is unclear, omit it.
      - Dates: use ISO YYYY-MM-DD for dates that are either explicitly stated or clearly given as relative phrases for that specific item.
        • Convert relative references (e.g., "today", "yesterday", "last week", "3 days ago", "last Monday") relative to reference date ${REFERENCE_DATE} (UTC).
        • Do NOT copy a date from one symptom to another.
        • Never set future dates. If no clear date is given, omit the date field.
      - Status (enums, exact strings):
        • stage: one of ["open", "closed", "in-progress"]
        • severity: one of ["mild", "moderate", "severe", "variable"]
        • progression: one of ["improving", "stable", "worsening", "variable"]
        Always include the status object. If no value is clearly implied, use defaults: stage="open", severity="variable", progression="variable".
      - Treatments/consultations:
        • Treatments: include only if the user already did them (exclude plans or recommendations). Look for verbs like "took", "used", "tried", "applied", "did". When identified, add them to treatmentsTried (dedupe case-insensitively); the description should remain a concise summary and not be the only place this information appears.
        • Consultations:
          - Past consultations (already happened): include with diagnosis; add any recommended or planned actions (e.g., MRI) to followUpActions.
          - Future appointments (booked/planned): include consultant and date; omit diagnosis; add any recommended/planned actions (e.g., MRI next week) to followUpActions.
          - Recommendations without a booked appointment (e.g., "doctor recommended an MRI next week") are not consultations on their own; however, if a future appointment is also implied/created, include the recommendation in that appointment’s followUpActions.
  - Multiple user messages: merge medically relevant facts across all user messages; the latest user message overrides earlier contradictions.
  - Do not invent fields or values. If a field is not clearly provided and has no default, omit it.
  - Do not include an "updates" field in the output.
    `,
    treatments: (currentRecord: Partial<HealthRecordType>) => `
      Append user-tried treatments to the current record. Output a single JSON object only (no prose).

      Output contract:
      {
        "description": string,
        "symptoms": Array<{ name: string, startDate?: string }>,
        "status": { stage: string, severity: string, progression: string },
        "treatmentsTried": string[],
  "medicalConsultations"?: Array<{ consultant: string, date?: string, diagnosis?: string, followUpActions?: string[] }>
      }

  Rules (append-only):
  - Preserve all existing fields from currentRecord.
  - Treatments are append-only: never remove or reorder existing items; only add clearly stated items the user already did (e.g., "I took ibuprofen").
  - Do NOT include recommendations or plans (e.g., "doctor recommended" or "will try").
  - Normalize: trim strings and deduplicate case-insensitively; keep the original order of existing items.
  - If no treatments are mentioned, keep the array unchanged. Do not invent items.
  - Do not alter status, symptoms, or consultations unless explicitly corrected by the user.

      currentRecord:
      ${JSON.stringify(currentRecord)}

      Output JSON only; do not invent values; apply the rules strictly.
      Do not include an "updates" field in the output.
    `,
    symptoms: (currentRecord: Partial<HealthRecordType>) => `
      Append clearly stated additional symptoms to the current record. Output a single JSON object only (no prose).

      Output contract:
      {
        "description": string,
        "symptoms": Array<{ name: string, startDate?: string }>,
        "status": { stage: string, severity: string, progression: string },
        "treatmentsTried"?: string[],
  "medicalConsultations"?: Array<{ consultant: string, date?: string, diagnosis?: string, followUpActions?: string[] }>
      }

    Rules (append-only):
    - Preserve all existing fields and items exactly as they are; never remove or reorder existing symptoms.
    - Add only symptoms that are explicitly and clearly mentioned; append new items to the end of the array.
    - Separate unrelated symptoms into distinct entries; do not group.
    - Dates: use ISO YYYY-MM-DD. Convert relative references (e.g., "today", "yesterday", "last week", "3 days ago", "last Monday") relative to ${REFERENCE_DATE} (UTC); never future dates; omit if unclear.
    - Ignore non-medical content and vague/ambiguous statements; do not guess symptoms.
    - If no new symptoms are present, keep the array unchanged.

      currentRecord:
      ${JSON.stringify(currentRecord)}

      Output JSON only; do not invent values; apply the rules strictly.
      Do not include an "updates" field in the output.
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
  "medicalConsultations": Array<{ consultant: string, date?: string, diagnosis?: string, followUpActions?: string[] }>
      }

      Rules (append-only):
      - Start from currentRecord and preserve all existing fields and items. Do not remove, replace, or reorder existing consultations.
      - Append new consultations only when explicitly provided. Update an existing consultation only if the user clearly corrects that same visit (match by consultant and/or date). Otherwise, keep previous entries exactly as-is.
      - Consultations:
    • Past consultations (already happened): include with diagnosis; also include any recommended/planned actions (tests like MRI, medications, appointments) as followUpActions.
    • Future appointments (booked/planned): include consultant and date; omit diagnosis; include recommended/planned actions (e.g., MRI next week) as followUpActions.
    • Recommendations without a booked appointment are not consultations by themselves; if a future appointment is also implied, attach the recommendation as followUpActions.
      - Fields:
        • consultant: include name and role if provided (e.g., "Dr. Smith, cardiologist").
  • date: use ISO YYYY-MM-DD; convert relative references (e.g., "today", "yesterday", "last week", "3 days ago", "last Monday") relative to ${REFERENCE_DATE} (UTC); never future dates; omit if unclear.
  • diagnosis: include only for past consultations; omit for future appointments.
  • followUpActions: list recommended or planned actions (tests like MRI, medications, appointments, care). This can apply to both past consultations and future appointments. If none, use an empty array.
      - Do not infer or fabricate information. Omit fields that are not clearly provided.
      - Status enums must remain one of: stage ["open","closed","in-progress"], severity ["mild","moderate","severe","variable"], progression ["improving","stable","worsening","variable"]. If unclear, keep existing values.

      currentRecord:
      ${JSON.stringify(currentRecord)}

      Output JSON only; do not invent values; apply the rules strictly.
      Do not include an "updates" field in the output.
    `,
    followUps: (currentRecord: Partial<HealthRecordType>, consultationIndex: number) => `
      This is your output—update it minimally to include only the new follow-up actions. Preserve everything else.
      Do not modify unrelated fields.
      ${JSON.stringify(currentRecord)}

      Identify and extract follow-up actions mentioned by the user. Add them only to the "followUpActions" array for the ${indexToNatural(consultationIndex)} consultation.
      - Append-only: do not remove existing follow-up actions; add new ones at the end (dedupe case-insensitively).
      - If multiple follow-up actions are mentioned, add each as a separate item.
      - If none are mentioned, leave the array unchanged.
    `,
    update: (currentRecord: Partial<HealthRecordType>) => `
      Update an existing health record by merging new user input into the current record. Output a single JSON object only (no prose).

      Output contract:
      {
        "description": string,
        "symptoms": Array<{ name: string, startDate?: string }>,
        "status": { stage: string, severity: string, progression: string },
        "treatmentsTried"?: string[],
        "medicalConsultations"?: Array<{ consultant: string, date?: string, diagnosis?: string, followUpActions?: string[] }>
      }

    Merge rules (append-only):
    - Start from currentRecord. Arrays are append-only: keep all existing items and their order for symptoms, treatmentsTried, and medicalConsultations. Do not remove or replace prior items unless the user explicitly says to remove/correct them.
    - When the user clearly corrects a prior item (e.g., same consultant and/or date), update that specific item instead of creating a duplicate. Otherwise append new information.
    - Description: produce a concise, cleaned summary combining prior content with any new medically relevant details.
    - Symptoms: append clearly stated new symptoms; never drop existing symptoms. Omit startDate if unclear.
      - Status (enums, exact strings):
        • stage in ["open","closed","in-progress"],
        • severity in ["mild","moderate","severe","variable"],
        • progression in ["improving","stable","worsening","variable"].
        If no change is clearly implied, keep currentRecord values; if absent and unclear, use defaults stage="open", severity="variable", progression="variable".
        Map phrases like "getting worse/worsening" to progression="worsening". Do not change severity unless explicitly stated.
      - Treatments: append clearly mentioned items the user already did (verbs: took/used/tried/applied/did); deduplicate by case-insensitive string match; never remove existing items. Exclude plans (e.g., "I will try").
      - Consultations: append new consultations when explicitly provided; never drop or reorder existing ones. Update an existing visit only if the user clearly corrects it (match by consultant and/or date). Otherwise, keep prior entries unchanged and add new ones at the end.
  - Dates: use ISO YYYY-MM-DD. Convert relative references (e.g., "today", "yesterday", "last week", "3 days ago", "last Monday") relative to ${REFERENCE_DATE} (UTC). Never set future dates. Omit date fields if not clearly provided.
  - Multiple user messages: merge facts; the latest message overrides earlier contradictions.
  - Do not invent fields or values. If a field is not clearly provided and has no default, omit it.
  - Do not include an "updates" field in the output.

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
      "Any other symptoms to add? We'll keep your existing list—just share new ones, one per line (e.g., 'headache', 'nausea'). Dates are optional; if unsure, skip them.",
    treatments:
      "Have you already tried any treatments for this condition (e.g., ibuprofen, ice, rest)? List only what you've already done—exclude plans or doctor recommendations.",
  },
};
