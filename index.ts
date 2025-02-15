import { protos, SpeechClient } from "@google-cloud/speech";
import cors from "cors";
import express, { Request, Response } from "express";
import fs from "fs";
import OpenAI from "openai";
import { systemPrompt, userPrompt } from "./ai-prompts/prompts";
import db from "./startup/db";

db();

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json()); // parse JSON bodies
app.use(express.urlencoded({ extended: true })); // handle form data

// const Schema = mongoose.Schema;
// const TestSchema = new Schema({
//   name: String,
// });

// const TestModel = mongoose.model("Test", TestSchema);

// app.get("/test-db", async (req: Request, res: Response) => {
//   const testDoc = new TestModel({ name: "Test Document" });
//   await testDoc.save();
//   res.send("Hello, World! Document saved.");
// });

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

app.post("/chat-structured", async (req: Request, res: Response) => {
  const completion = await openAIClient.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    // response_format: { type: "json_object" },
  });

  const healthRecord = JSON.parse(completion.choices[0].message.content as string);

  res.send({ healthRecord });
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
