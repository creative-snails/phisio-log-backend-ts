import { HealthRecordType, MedicalConsultationType, SymptomType } from "../models/health-record/healthRecordValidation";
import { Conversation } from "../routes/healthRecords.routes";

export function indexToNatural(index: number): string {
  const naturalOrder = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
  if (index < 0 || index >= naturalOrder.length) return "";
  return naturalOrder[index];
}

export function removeStaleConversations(conversations: Map<string, { lastAccessed: number }>, maxAge: number) {
  const now = Date.now();
  try {
    conversations.forEach((conversation, id) => {
      if (now - conversation.lastAccessed > maxAge) conversations.delete(id);
    });
    console.log("Stale conversations successfully removed.");
  } catch (error) {
    console.log("Removing stale conversations failed: ", error);
  }
}

export function getConversation(conversations: Map<string, Conversation>, conversationId: string) {
  const conversation = conversations.get(conversationId);
  if (!conversation) return;

  conversation.history = conversation.history.filter((prompt) => prompt.role === "user" || prompt.role === "system");
  conversation.lastAccessed = Date.now();
  return conversation;
}

export function preProcessDates(data: Partial<HealthRecordType>): Partial<HealthRecordType> {
  if (data.symptoms) {
    data.symptoms = data.symptoms.map((symptom: SymptomType) =>
      symptom?.startDate ? { ...symptom, startDate: new Date(symptom.startDate) } : symptom
    );
  }

  if (data.medicalConsultations) {
    data.medicalConsultations = data.medicalConsultations.map((consultation: MedicalConsultationType) =>
      consultation?.date ? { ...consultation, date: new Date(consultation.date) } : consultation
    );
  }

  return data;
}
