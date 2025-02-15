export const initialPrompt =
  "Please describe your health situation. You can mention symptoms, treatments you've tried, severity, or anything else you think is important.";

export const extractInitialPropmt =
  "Extract the health record information, igonre the updates section since this is the first input";

export const userPrompt =
  "I have some pain in the neck and in the shoulders and I think it was due to some old injury and probably unhealthy sitting positions and maybe also lack of workout so I have been trying to go to the gym more often and do some stretches and it's been improving but it's never gone so sometimes it's strong and sometimes it is more bearable so usually I feel I find it hard to stand up because I feel like my body is leaning to one side more than the other so I'm constantly trying to find some balance and that's very exhausting with time even when I'm sleeping I feel like I have one side that is stronger than the other";

export const systemPrompt = `
      Based on the user's input, generate a JSON object with the following structure:

    {
      "description":  "",
      "symptoms": [
          {
            "name": "",
            "startDate": "",
            "duration": ""
          }
        ],
      "status": "",
      "treatmentsTried": ["Treatment 1", "Treatment 2"],
      "improvementStatus": "",
      "medicalConsultations": [
          {
            "consultant": "",
            "date": "",
            "diagnosis": "",
            "followUpActions": ["Action 1", "Action 2"]
          }
        ],
      "severity": ""
    }

    If a value was not provided keep the value empty.
    `;
