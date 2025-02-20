import { protos, SpeechClient } from "@google-cloud/speech";
import cors from "cors";
import express, { Request, Response } from "express";
import fs from "fs";
import OpenAI from "openai";
import { newSystemPrompt } from "./ai-prompts/prompts";
import HealthRecord from "./models/health-record/healthRecord";
import { HealthRecordType, Z_HealthRecord } from "./models/health-record/healthRecordValidation";
import db from "./startup/db";

db();

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json()); // parse JSON bodies
app.use(express.urlencoded({ extended: true })); // handle form data

// Initialize Google Speech-to-Text client
const googleClient = new SpeechClient({
  keyFilename: "./phisiolog-service-account.json",
});

// Initialize OpenAI client
const openAIClient = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

app.post("/chat-user", async (req: Request, res: Response) => {
  const chatCompletion = await openAIClient.chat.completions.create({
    messages: [{ role: "user", content: req.body.message }],
    model: "gpt-3.5-turbo",
  });

  const myJSON = JSON.parse(chatCompletion.choices[0].message.content as string);

  res.send({ myJSON });
});

type Message = {
  role: "system" | "user";
  content: string;
};

const history: Record<string, Message[]> = {
  "123": [{ role: "system", content: newSystemPrompt }],
};

// model: "gpt-4",
async function chat(messages: Message[]) {
  const completion = await openAIClient.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: messages,
    response_format: { type: "json_object" },
  });

  // console.log(completion.choices[0].message);
  return completion.choices[0].message.content as string;
}

app.post("/chat-structured", async (req: Request, res: Response) => {
  const conversionId = req.body.conversationId || "123";
  history[conversionId].push({ role: "user", content: req.body.message });
  let message = "";

  let result = await chat(history[conversionId]);
  let healthRecord: Partial<HealthRecordType> = JSON.parse(result);
  let newPrompt = `This was your output, update it to iclude the new requirements. Don't update single value entries that were already generated: ${result}`;

  console.log(history[conversionId].length);

  message = "You provided only one symptom, do you have more sympotms that can be added to the record.";
  if (history[conversionId].length > 2 && (healthRecord.symptoms?.length ?? 0) <= 1) {
    message = "";
    newPrompt += "Extract any additional symptoms detected and add them to the array.";

    result = await chat(history[conversionId]);
    healthRecord = JSON.parse(result);

    healthRecord.symptoms?.forEach((s) => {
      if (s.startDate) s.startDate = new Date(s.startDate);
      else delete s.startDate;
    });

    try {
      Z_HealthRecord.parse(healthRecord);
      console.log("Validation successfull!");
    } catch (error) {
      console.log("Validation failed: ", error);
    }

    const dbHealthRecord = new HealthRecord({ ...healthRecord });
    await dbHealthRecord.save();

    healthRecord = dbHealthRecord;
  }

  history[conversionId].push({ role: "system", content: newPrompt });

  res.send({ message, healthRecord });
});

app.post("/transcribe", async (req: Request, res: Response) => {
  const audioFilePath = "./transcript-test-10-seconds.wav";

  const audio = {
    content: fs.readFileSync(audioFilePath).toString("base64"),
  };

  const config: protos.google.cloud.speech.v1.IRecognitionConfig = {
    encoding: protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16,
    languageCode: "en-US",
    sampleRateHertz: 16000,
  };

  const request: protos.google.cloud.speech.v1.IRecognizeRequest = {
    audio: audio,
    config: config,
  };

  try {
    const [response] = await googleClient.recognize(request);
    const transcription = response.results?.map((result) => result?.alternatives?.[0]?.transcript).join("\n");
    res.send(`Transcription: ${transcription}`);
  } catch (error) {
    console.error("Error transcribing audio:", error);
    res.status(500).send("Error transcribing audio");
  }
});

app.get("/", (req: Request, res: Response) => {
  res.send("Hello, World!");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
