import { Request, Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { initialSystemPrompt } from "../ai-prompts/prompts";
import HealthRecord from "../models/health-record/healthRecord";
import { HealthRecordType } from "../models/health-record/healthRecordValidation";
import { validateHealthRecord } from "../services/customValidators";
import { jsonGen, Message } from "../services/genAI";
// import transcribe from "../services/transcription";

const router = Router();

type Conversation = {
  id: string;
  history: Message[];
  lastAccessed: number;
  requestedData: {
    additionalSymptoms: boolean;
    treatmentsTried: boolean;
    medicalConsultations: boolean;
  };
};

const conversations = new Map<string, Conversation>();

const createNewConversation = (): Conversation => {
  const conversation: Conversation = {
    id: uuidv4(),
    history: [{ role: "system", content: initialSystemPrompt }],
    lastAccessed: Date.now(),
    requestedData: {
      additionalSymptoms: false,
      treatmentsTried: false,
      medicalConsultations: false,
    },
  };

  conversations.set(conversation.id, conversation);
  return conversation;
};

router.post("/", async (req: Request, res: Response) => {
  try {
    let newSystemPrompt = "";
    let healthRecord: Partial<HealthRecordType> = {};
    const conversation = conversations.get(req.body.conversationId) || createNewConversation();

    conversation.history.push({ role: "user", content: req.body.message });

    const generatedJSON = await jsonGen(conversation.history);
    healthRecord = JSON.parse(generatedJSON);
    const validationResult = await validateHealthRecord(healthRecord, conversation.history);

    if (validationResult.userPrompt)
      conversation.history.push({ role: "assistant", content: validationResult.userPrompt });

    if (validationResult.success) {
      newSystemPrompt += validationResult?.systemPrompt ?? "";

      const savedHealthRecord = new HealthRecord({ ...healthRecord });
      await savedHealthRecord.save();

      healthRecord = savedHealthRecord;

      res.status(201).json({
        conversationId: conversation.id,
        healthRecordId: savedHealthRecord._id,
        message: validationResult.userPrompt,
        healthRecord: savedHealthRecord,
      });
    } else {
      res.status(200).json({
        conversationId: conversation.id,
        message: validationResult.userPrompt,
      });
    }
    newSystemPrompt += `This was your output, update it to iclude the new requirements.
                Don't update single value entries that were already generated if not needed:\n ${JSON.stringify(healthRecord)}`;

    if (validationResult.userPrompt) conversation.history.push({ role: "system", content: newSystemPrompt });
    console.log(conversation);
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
});

const history: Record<string, Message[]> = {
  "123": [{ role: "system", content: initialSystemPrompt }],
};

router.post("/temp", async (req: Request, res: Response) => {
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
                Don't update single value entries that were already generated if not needed: ${result}`;

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
