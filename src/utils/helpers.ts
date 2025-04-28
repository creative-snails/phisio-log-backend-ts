import { Message } from "../services/genAI";

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

export function cleanUpPrompts(conversationHistory: Message[]) {
  let lastSystemIndex = -1;
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    if (conversationHistory[i].role === "system") {
      lastSystemIndex = i;
      break;
    }
  }
  if (lastSystemIndex === -1) return conversationHistory;
  // Keep the last system and all user prompts
  return conversationHistory.filter((prompt: Message, index: number) => {
    if (prompt.role === "system") return index === lastSystemIndex;
    if (prompt.role === "assistant") return false;
    return true;
  });
}
