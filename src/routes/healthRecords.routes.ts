import { Request, Response, Router } from "express";
import { initialSystemPrompt } from "../ai-prompts/prompts";
import HealthRecord from "../models/health-record/healthRecord";
import { HealthRecordType } from "../models/health-record/healthRecordValidation";
import { validateHealthRecord } from "../services/customValidators";
import { jsonGen, Message } from "../services/genAI";
// import transcribe from "../services/transcription";

const router = Router();

const history: Record<string, Message[]> = {
  "123": [{ role: "system", content: initialSystemPrompt }],
};

router.post("/", async (req: Request, res: Response) => {
  try {
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
    let newSystemPrompt = "";

    const result = await jsonGen(history[conversionId]);
    let healthRecord: Partial<HealthRecordType> = JSON.parse(result);

    const validationResult = await validateHealthRecord(healthRecord, history[conversionId]);

    if (!validationResult?.success) message = validationResult?.userPrompt ?? "";

    if (validationResult.success && validationResult.systemPrompt) {
      message = validationResult?.userPrompt ?? "";
      newSystemPrompt += validationResult?.systemPrompt ?? "";

      // result = await jsonGen(history[conversionId]);
      // healthRecord = JSON.parse(result);
    }

    newSystemPrompt += `This was your output, update it to iclude the new requirements.
                Don't update single value entries that were already generated: ${result}`;

    if (validationResult.success) {
      let dbHealthRecord: HealthRecordType;
      try {
        if (!req.body.healthRecordId) {
          const savedHealthRecord = new HealthRecord({ ...healthRecord });
          await savedHealthRecord!.save();
          console.log("Created new record");
          dbHealthRecord = savedHealthRecord;
        } else {
          const updatedRecord = await HealthRecord.findByIdAndUpdate(
            req.body.healthRecordId,
            { ...healthRecord },
            { new: true }
          );

          if (!updatedRecord) throw new Error("Health record not found");

          console.log("Updated existing record");
          dbHealthRecord = updatedRecord;
        }
      } catch (error: unknown) {
        throw new Error(`Failed to ${req.body.healthRecordId ? "update" : "create"} health record: ${error}`);
      }

      healthRecord = dbHealthRecord;
    }

    history[conversionId].push({ role: "system", content: newSystemPrompt });

    res.status(200).json({ message, healthRecord });
  } catch (error: unknown) {
    res.status(500).json({ error: "Internal server error", message: error });
  }
});

export default router;
