import { Request, Response, Router } from "express";
import { schedule } from "node-cron";
import { v4 as uuidv4 } from "uuid";
import prompts from "../ai-prompts/prompts";
import HealthRecord from "../models/health-record/healthRecord";
import { HealthRecordType, HealthRecordUpdateType } from "../models/health-record/healthRecordValidation";
import { validateHealthRecord } from "../services/customValidators";
import { jsonGen, Message } from "../services/genAI";

const router = Router();

export type Conversation = {
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

const createNewConversation = (systemPrompt: string): Conversation => {
  const conversation: Conversation = {
    id: uuidv4(),
    history: [{ role: "system", content: systemPrompt }],
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
    let systemPrompt = "";
    let healthRecord: Partial<HealthRecordType> = {};
    const { conversationId, message } = req.body;

    const conversation = conversations.get(conversationId) || createNewConversation(prompts.system.init);
    conversation.lastAccessed = Date.now();

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
    } else {
      res.status(200).json({
        conversationId: conversation.id,
        message: validationResult.assistantPrompt,
      });
    }

    if (!healthRecord.updates?.length) delete healthRecord.updates;

    if (validationResult.assistantPrompt) conversation.history.push({ role: "system", content: systemPrompt });
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

    const conversation = conversations.get(conversationId);
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });

    const existingRecrod = await HealthRecord.findById(healthRecordId);
    if (!existingRecrod) return res.status(404).json({ error: "Health record not found" });

    healthRecord = existingRecrod;

    conversation.history.push(
      { role: "system", content: prompts.system.update(healthRecord) },
      { role: "user", content: message }
    );
    conversation.lastAccessed = Date.now();

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

      const conversation =
        conversations.get(conversationId) || createNewConversation(prompts.system.update(updateRecord ?? parentRecord));
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

        // This approach is used since positional $ operator yielded conflicts with createdAt and updatedAt fields
        let updatedRecord;
        if (updateHealthRecordId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const index = parentRecord.updates?.findIndex((update: any) => {
            return update._id.toString() == updateHealthRecordId;
          });

          if (index === undefined || index === -1)
            return res.status(404).json({ error: "Health record update not found" });

          Object.assign(parentRecord.updates[index], healthRecordUpdate);

          updatedRecord = await parentRecord.save();
        } else {
          updatedRecord = await HealthRecord.findByIdAndUpdate(
            parentHealthRecordId,
            { $push: { updates: healthRecordUpdate } },
            { new: true }
          );
        }

        if (!updatedRecord) return res.status(404).json({ error: "Health record not found asdfasdf" });

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
