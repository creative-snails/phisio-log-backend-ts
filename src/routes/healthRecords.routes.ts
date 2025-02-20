import express, { Request, Response } from "express";
import { initialSystemPrompt } from "../ai-prompts/prompts";
import HealthRecord from "../models/health-record/healthRecord";
import { HealthRecordType, Z_HealthRecord } from "../models/health-record/healthRecordValidation";
import chat, { Message } from "../services/genAI";
// import transcribe from "../services/transcription";

const router = express.Router();

const history: Record<string, Message[]> = {
  "123": [{ role: "system", content: initialSystemPrompt }],
};

router.post("/", async (req: Request, res: Response) => {
  // in the real scenario we'll transcribe and audio file
  // const audioFilePath = "./transcript-test-10-seconds.wav";
  // let transcription = ""

  // try {
  //   transcription = await transcribe(audioFilePath);
  //   res.send(`Transcription: ${transcription}`);
  // } catch (error) {
  //   console.error("Error transcribing audio:", error);
  //   res.status(500).send("Error transcribing audio");
  // }

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

export default router;
