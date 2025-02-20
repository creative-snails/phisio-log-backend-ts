import { Request, Response, Router } from "express";
import { ZodError } from "zod";
import { initialSystemPrompt } from "../ai-prompts/prompts";
import HealthRecord from "../models/health-record/healthRecord";
import { HealthRecordType, Z_HealthRecord } from "../models/health-record/healthRecordValidation";
import { jsonGen, Message, textGen } from "../services/genAI";
// import transcribe from "../services/transcription";

const router = Router();

const history: Record<string, Message[]> = {
  "123": [{ role: "system", content: initialSystemPrompt }],
};

async function validateHealthRecord(healthRecord: Partial<HealthRecordType>) {
  let validationPrompt = "";
  try {
    Z_HealthRecord.parse(healthRecord);
    console.log("Validation successful!");
    return { success: true };
  } catch (error) {
    if (error instanceof ZodError) {
      const validationErrors = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      const missingFields = validationErrors.filter((err) => err.message.includes("Required")).map((err) => err.field);
      const invalidFields = validationErrors
        .filter((err) => !err.message.includes("Required"))
        .map((err) => `${err.field} (${err.message})`);

      validationPrompt += `Generate a user friendly prompt starting with the below and leveraging
                         the error messages resulting from validation of the previous input.
                        Please provide the following information to complete the health record:`;

      if (missingFields.length) {
        validationPrompt += "\nMissing required fields:\n";
        missingFields.forEach((field) => (validationPrompt += `- ${field}\n`));
      }

      if (invalidFields.length) {
        validationPrompt += "\nFields with invalid data:\n";
        invalidFields.forEach((field) => (validationPrompt += `- ${field}\n`));
      }

      const userPrompt = await textGen([{ role: "user", content: validationPrompt }]);

      return {
        success: false,
        validationErrors,
        userPrompt,
      };
    }
  }

  return {
    success: false,
  };
}

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

    let result = await jsonGen(history[conversionId]);
    let healthRecord: Partial<HealthRecordType> = JSON.parse(result);
    let newPrompt = `This was your output, update it to iclude the new requirements.
                  Don't update single value entries that were already generated: ${result}`;

    const validationResult = await validateHealthRecord(healthRecord);

    if (!validationResult?.success) message = validationResult?.userPrompt ?? "";

    // message = "You provided only one symptom, do you have more sympotms that can be added to the record.";
    if (history[conversionId].length > 2 && (healthRecord.symptoms?.length ?? 0) <= 1) {
      message = "";
      newPrompt += "Extract any additional symptoms detected and add them to the array.";

      result = await jsonGen(history[conversionId]);
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

    res.status(200).json({ message, healthRecord });
  } catch (error: unknown) {
    res.status(500).json({ error: "Internal server error", message: error });
  }
});

export default router;
