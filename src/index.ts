import { protos, SpeechClient } from "@google-cloud/speech";
import cors from "cors";
import express, { Request, Response } from "express";
import fs from "fs";

const app = express();
const port = 4000;

app.use(cors());

// Initialize Google Speech-to-Text client
const client = new SpeechClient({
  keyFilename: "./phisiolog-service-account.json",
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
    const [response] = await client.recognize(request);
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
