import { Request, Response, Router } from "express";
import { schedule } from "node-cron";
import { v4 as uuidv4 } from "uuid";
import { initialSystemPrompt } from "../ai-prompts/prompts";
import HealthRecord from "../models/health-record/healthRecord";
import { HealthRecordType } from "../models/health-record/healthRecordValidation";
import { validateHealthRecord } from "../services/customValidators";
import { jsonGen, Message } from "../services/genAI";

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

router.post("/new-record", async (req: Request, res: Response) => {
  try {
    let newSystemPrompt = "";
    let healthRecord: Partial<HealthRecordType> = {};
    const { conversationId, message } = req.body;

    const conversation = conversations.get(conversationId) || createNewConversation();
    conversation.lastAccessed = Date.now();

    conversation.history.push({ role: "user", content: message });

    const generatedJSON = await jsonGen(conversation.history);
    console.log(generatedJSON);

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
        healthRecord,
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
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.put("/new-record/:healthRecordId", async (req: Request, res: Response): Promise<Response | any> => {
  try {
    let newSystemPrompt = "";
    let healthRecord: Partial<HealthRecordType> = {};
    const { healthRecordId } = req.params;
    const { conversationId, message } = req.body;

    if (!conversationId || !healthRecordId)
      return res.status(400).json({ error: "Both conversationId and healthRecordId are required" });

    const conversation = conversations.get(conversationId);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });

    conversation.history.push({ role: "user", content: message });
    conversation.lastAccessed = Date.now();

    const generatedJSON = await jsonGen(conversation.history);
    healthRecord = JSON.parse(generatedJSON);
    const validationResult = await validateHealthRecord(healthRecord, conversation.history);

    if (validationResult.userPrompt)
      conversation.history.push({ role: "assistant", content: validationResult.userPrompt });

    if (validationResult.success) {
      newSystemPrompt += validationResult?.systemPrompt ?? "";

      const updatedRecord = await HealthRecord.findByIdAndUpdate(healthRecordId, { ...healthRecord }, { new: true });

      if (!updatedRecord) return res.status(404).json({ error: "Health record not found" });

      healthRecord = updatedRecord;

      res.status(200).json({
        conversationId: conversation.id,
        message: validationResult.userPrompt,
        healthRecord,
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
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
});

export default router;

const cleanup = () => {
  const MAX_AGE = 24 * 60 * 60 * 1000;
  const now = Date.now();

  try {
    conversations.forEach((conversation, id) => {
      if (now - conversation.lastAccessed > MAX_AGE) conversations.delete(id);
    });
    console.log("Cleanup completed successfully");
  } catch (error) {
    console.log("Cleanup failed: ", error);
  }
};

// Runs at the start of every hour
schedule("0 * * * *", cleanup, {
  scheduled: true,
  timezone: "UTC",
});
