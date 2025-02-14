export const initialPrompt =
  "Please describe your health situation. You can mention symptoms, treatments you've tried, severity, or anything else you think is important.";

export const extractInitialData = (input: string) => {
  return `
      "Based on the user's input, generate a JSON object with the following structure:

    {
      "description": {
        "required": true,
        "value": ""
      },
      "symptoms": {
        "required": true,
        "value": [
          {
            "name": {
              "value": "",
              "required": true
            },
            "startDate": {
              "value": "",
              "required": true
            },
            "duration": {
              "value": "",
              "required": false
            }
          }
        ]
      },
      "status": {
        "required": true,
        "value": ""
      },
      "treatmentsTried": {
        "required": false,
        "value": [
          {
            "value": "",
            "required": false
          }
        ]
      },
      "improvementStatus": {
        "required": true,
        "value": ""
      },
      "medicalConsultations": {
        "required": false,
        "value": [
          {
            "consultant": {
              "value": "",
              "required": true
            },
            "date": {
              "value": "",
              "required": true
            },
            "diagnosis": {
              "value": "",
              "required": true
            },
            "followUpActions": [
              {
                "value": "",
                "required": false
              }
            ]
          }
        ]
      },
      "severity": {
        "required": true,
        "value": ""
      }
    }

    User's input: ${input}

    Generate the JSON object based on the user's input."`;
};
