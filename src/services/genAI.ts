import OpenAI from "openai";

// Initialize OpenAI client
const openAIClient = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

export const textGen = async (messages: Message[]) => {
  const completion = await openAIClient.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: messages,
    temperature: 0.2,
  });

  return completion.choices[0].message.content as string;
};

export const jsonGen = async (messages: Message[]) => {
  const completion = await openAIClient.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: messages,
    response_format: { type: "json_object" },
    temperature: 0,
  });

  return completion.choices[0].message.content as string;
};
