import { Request, Response, Router } from "express";
import { schedule } from "node-cron";
import { v4 as uuidv4 } from "uuid";
import prompts from "../ai-prompts/prompts";
import HealthRecord from "../models/health-record/healthRecord";
import { HealthRecordType, HealthRecordUpdateType } from "../models/health-record/healthRecordValidation";
import { validateHealthRecord } from "../services/customValidators";
import { jsonGen, Message } from "../services/genAI";
import { getConversation, removeStaleConversations } from "../utils/helpers";

const MAX_CONVERSATION_AGE = 24 * 60 * 60 * 1000;

// Runs at the start of every hour
schedule("0 * * * *", () => removeStaleConversations(conversations, MAX_CONVERSATION_AGE), {
  scheduled: true,
  timezone: "UTC",
});

const router = Router();

export type Conversation = {
  id: string;
  history: Message[];
  lastAccessed: number;
  healthRecordId?: string; // new prop
  requestedData: {
    additionalSymptoms: boolean;
    treatmentsTried: boolean;
    medicalConsultations: boolean;
    followUps: boolean[];
  };
};

const conversations = new Map<string, Conversation>();

const createNewConversation = (systemPrompt: string, healthRecordId?: string): Conversation => {
  const conversation: Conversation = {
    id: uuidv4(),
    history: [{ role: "system", content: systemPrompt }],
    lastAccessed: Date.now(),
    healthRecordId, // new prop
    requestedData: {
      additionalSymptoms: false,
      treatmentsTried: false,
      medicalConsultations: false,
      followUps: [],
    },
  };

  conversations.set(conversation.id, conversation);
  return conversation;
};

router.post("/new-record", async (req: Request, res: Response) => {
  try {
    let systemPrompt = "";
    let healthRecord: Partial<HealthRecordType> = {};
    const { conversationId, message } = req.body;

    const conversation = getConversation(conversations, conversationId) || createNewConversation(prompts.system.init);
    conversation.history.push({ role: "user", content: message });

    const generatedJSON = await jsonGen(conversation.history);
    healthRecord = JSON.parse(generatedJSON);

    const validationResult = await validateHealthRecord(healthRecord, conversation);

    if (validationResult.assistantPrompt)
      conversation.history.push({ role: "assistant", content: validationResult.assistantPrompt });

    if (validationResult.success) {
      systemPrompt = validationResult?.systemPrompt ?? "";

      const savedHealthRecord = new HealthRecord({ ...healthRecord });
      await savedHealthRecord.save();

      healthRecord = savedHealthRecord;

      res.status(201).json({
        conversationId: conversation.id,
        healthRecordId: savedHealthRecord._id,
        message: validationResult.assistantPrompt,
        healthRecord,
      });
      if (validationResult?.systemPrompt) conversation.history.push({ role: "system", content: systemPrompt });
    } else {
      res.status(200).json({
        conversationId: conversation.id,
        message: validationResult.assistantPrompt,
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
});

router.put("/new-record/:healthRecordId", async (req: Request, res: Response): Promise<void> => {
  try {
    let systemPrompt = "";
    let healthRecord: Partial<HealthRecordType> = {};
    const { healthRecordId } = req.params;
    const { conversationId, message } = req.body;

    if (!conversationId || !healthRecordId) {
      res.status(400).json({ error: "Both conversationId and healthRecordId are required" });
      return;
    }

    const conversation = getConversation(conversations, conversationId);
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const existingRecrod = await HealthRecord.findById(healthRecordId);
    if (!existingRecrod) {
      res.status(404).json({ error: "Health record not found" });
      return;
    }

    healthRecord = existingRecrod;

    conversation.history.push(
      { role: "system", content: prompts.system.update(healthRecord) },
      { role: "user", content: message }
    );

    const generatedJSON = await jsonGen(conversation.history);
    healthRecord = JSON.parse(generatedJSON);
    const validationResult = await validateHealthRecord(healthRecord, conversation);

    if (validationResult.assistantPrompt)
      conversation.history.push({ role: "assistant", content: validationResult.assistantPrompt });

    if (validationResult.success) {
      systemPrompt = validationResult?.systemPrompt ?? "";

      const updatedRecord = await HealthRecord.findByIdAndUpdate(healthRecordId, { ...healthRecord }, { new: true });
      if (!updatedRecord) {
        res.status(404).json({ error: "Health record not found" });
        return;
      }

      healthRecord = updatedRecord;

      res.status(200).json({
        conversationId: conversation.id,
        message: validationResult.assistantPrompt,
        healthRecord,
      });
    } else {
      res.status(200).json({
        conversationId: conversation.id,
        message: validationResult.assistantPrompt,
      });
    }

    if (validationResult.assistantPrompt) conversation.history.push({ role: "system", content: systemPrompt });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
});

router.post("/updates/:parentId", async (req: Request, res: Response): Promise<void> => {
  try {
    let systemPrompt = "";
    let healthRecordUpdate: Partial<HealthRecordUpdateType> = {};
    const { parentId } = req.params;
    const { message } = req.body;

    const parentRecord = await HealthRecord.findById(parentId);
    if (!parentRecord) {
      res.status(404).json({ error: "Health record not found" });
      return;
    }

    const conversation = createNewConversation(prompts.system.update(parentRecord), parentId);
    conversation.lastAccessed = Date.now();
    conversation.history.push({ role: "user", content: message });

    const generatedJSON = await jsonGen(conversation.history);
    healthRecordUpdate = JSON.parse(generatedJSON);

    // Third argument indicates whether this is an update (default is false)
    const validationResult = await validateHealthRecord(healthRecordUpdate, conversation, true);

    if (validationResult.assistantPrompt)
      conversation.history.push({ role: "assistant", content: validationResult.assistantPrompt });

    if (validationResult.success) {
      systemPrompt = validationResult?.systemPrompt ?? "";

      const newUpdateRecord = new HealthRecord({ ...healthRecordUpdate, rootId: parentRecord.rootId ?? parentId });
      await newUpdateRecord.save();

      const rootId = newUpdateRecord.rootId;
      if (rootId) {
        await HealthRecord.findByIdAndUpdate(
          rootId,
          { $push: { updates: newUpdateRecord._id } },
          { new: true, runValidators: true }
        );
      }

      res.status(200).json({
        conversationId: conversation.id,
        message: validationResult.assistantPrompt,
        healthRecord: newUpdateRecord,
      });
    } else {
      res.status(200).json({
        conversationId: conversation.id,
        message: validationResult.assistantPrompt,
      });
    }
    if (validationResult.assistantPrompt) conversation.history.push({ role: "system", content: systemPrompt });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
});

export default router;
