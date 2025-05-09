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

    console.log("\n\nCONVERSATION HISTORY post FIRST: ", JSON.stringify(conversation.history, null, 2) + "\n\n");

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

    console.log("\n\nCONVERSATION HISTORY post LAST: ", JSON.stringify(conversation.history, null, 2) + "\n\n");
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.put("/new-record/:healthRecordId", async (req: Request, res: Response): Promise<Response | any> => {
  try {
    let systemPrompt = "";
    let healthRecord: Partial<HealthRecordType> = {};
    const { healthRecordId } = req.params;
    const { conversationId, message } = req.body;

    if (!conversationId || !healthRecordId)
      return res.status(400).json({ error: "Both conversationId and healthRecordId are required" });

    const conversation = getConversation(conversations, conversationId);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });

    console.log("\n\nCONVERSATION HISTORY put FIRST: ", JSON.stringify(conversation.history, null, 2) + "\n\n");

    const existingRecrod = await HealthRecord.findById(healthRecordId);
    if (!existingRecrod) return res.status(404).json({ error: "Health record not found" });

    healthRecord = existingRecrod;

    conversation.history.push(
      { role: "system", content: prompts.system.update(healthRecord) },
      { role: "user", content: message }
    );
    console.log("\n\nCONVERSATION HISTORY put MID: ", JSON.stringify(conversation.history, null, 2) + "\n\n");
    const generatedJSON = await jsonGen(conversation.history);
    healthRecord = JSON.parse(generatedJSON);
    const validationResult = await validateHealthRecord(healthRecord, conversation);

    if (validationResult.assistantPrompt)
      conversation.history.push({ role: "assistant", content: validationResult.assistantPrompt });

    if (validationResult.success) {
      systemPrompt = validationResult?.systemPrompt ?? "";

      const updatedRecord = await HealthRecord.findByIdAndUpdate(healthRecordId, { ...healthRecord }, { new: true });
      if (!updatedRecord) return res.status(404).json({ error: "Health record not found" });

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
    console.log("CONVERSATION HISTORY put LAST: ", conversation.history);
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
});

router.put(
  "/updates/:parentHealthRecordId/:updateHealthRecordId?",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (req: Request, res: Response): Promise<Response | any> => {
    try {
      let systemPrompt = "";
      let healthRecordUpdate: Partial<HealthRecordUpdateType> = {};
      const { parentHealthRecordId, updateHealthRecordId } = req.params;
      const { conversationId, message } = req.body;

      const parentRecord = await HealthRecord.findById(parentHealthRecordId);
      if (!parentRecord) return res.status(404).json({ error: "Health record not found" });

      let updateRecord;
      if (updateHealthRecordId) {
        const updateRecordTemp = await HealthRecord.findOne(
          { _id: parentHealthRecordId, "updates._id": updateHealthRecordId },
          {
            "updates.$": 1,
          }
        );
        if (!updateRecordTemp) return res.status(404).json({ error: "Health record update not found" });
        updateRecord = updateRecordTemp.updates[0];
      }

      let conversation = getConversation(conversations, conversationId);

      conversation =
        conversation && conversation?.healthRecordId === updateHealthRecordId
          ? conversation
          : createNewConversation(prompts.system.update(updateRecord ?? parentRecord), updateHealthRecordId);

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

        let updatedRecord;
        if (updateHealthRecordId) {
          const updateFields: { [key: string]: string | number | boolean | object | undefined } = {};
          Object.keys(healthRecordUpdate).forEach((key) => {
            if (key !== "_id" && key !== "createdAt" && key !== "updatedAt")
              updateFields[`updates.$[update].${key}`] = healthRecordUpdate[key as keyof typeof healthRecordUpdate];
          });

          updatedRecord = await HealthRecord.findOneAndUpdate(
            { _id: parentHealthRecordId, "updates._id": updateHealthRecordId },
            { $set: updateFields },
            {
              arrayFilters: [{ "update._id": updateHealthRecordId }],
              new: true,
            }
          );
        } else {
          updatedRecord = await HealthRecord.findByIdAndUpdate(
            parentHealthRecordId,
            { $push: { updates: healthRecordUpdate } },
            { new: true }
          );
        }

        if (!updatedRecord) return res.status(404).json({ error: "Health record not found" });

        res.status(200).json({
          conversationId: conversation.id,
          message: validationResult.assistantPrompt,
          healthRecord: updatedRecord,
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
  }
);

export default router;
