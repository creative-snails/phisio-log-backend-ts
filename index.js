const express = require('express')
const cors = require('cors')
const { SpeechClient } = require('@google-cloud/speech')
const fs = require('fs')

const app = express()
const port = 4000

app.use(cors())

// Initialize Google Speech-to-Text client
const client = new SpeechClient({
  keyFilename: './phisiolog-service-account.json', // Replace with the path to your service account key file
})

// Define a route to handle audio file upload and transcription
app.post('/transcribe', async (req, res) => {
  const audioFilePath = './male.wav' // Replace with the path to your audio file

  const audio = {
    content: fs.readFileSync(audioFilePath).toString('base64'),
  }

  const config = {
    encoding: 'LINEAR16',
    languageCode: 'en-US',
  }

  const request = {
    audio: audio,
    config: config,
  }

  try {
    const [response] = await client.recognize(request)
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n')
    res.send(`Transcription: ${transcription}`)
  } catch (error) {
    console.error('Error transcribing audio:', error)
    res.status(500).send('Error transcribing audio')
  }
})

app.get('/', (req, res) => {
  res.send('Hello, World!')
})

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`)
})
