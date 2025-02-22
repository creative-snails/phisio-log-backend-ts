import { protos, SpeechClient } from "@google-cloud/speech";
import fs from "fs";

// Initialize Google Speech-to-Text client
const googleClient = new SpeechClient({
  keyFilename: "./phisiolog-service-account.json",
});

const transcribe = async (audioFilePath: string) => {
  const audio = { content: fs.readFileSync(audioFilePath).toString("base64") };

  const config: protos.google.cloud.speech.v1.IRecognitionConfig = {
    encoding: protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16,
    languageCode: "en-US",
    sampleRateHertz: 16000,
  };

  const request: protos.google.cloud.speech.v1.IRecognizeRequest = {
    audio: audio,
    config: config,
  };

  const [response] = await googleClient.recognize(request);
  const transcription = response.results?.map((result) => result?.alternatives?.[0]?.transcript).join("\n");

  return transcription;
};

export default transcribe;
