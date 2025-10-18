
The feature to implement is speech-to-speech interaction using ElevenLabs APIs. The system must convert a user’s voice input into text using ElevenLabs Speech-to-Text (STT), generate a chatbot response based on that text, and then convert the chatbot’s reply back into speech using ElevenLabs Text-to-Speech (TTS). The goal is to enable natural, real-time voice conversations between the user and the AI assistant.


this feature should be added in ```src/app/dashboard/DashboardExample.tsx``` for front-end and for back-end create new service for it.

on dashboard we have chatbot where we are going to add new voice button and if clicked this then it should start conversation instead of chatting. we need all this happen to this modal.




technical needs:

ELEVENLABS_API_KEY=69dae2179397c5b165923e133959dbbbf00f6c2e08a22212e492cd6b05f7a28f

npm install @elevenlabs/elevenlabs-js

```

import { ElevenLabsClient, play } from '@elevenlabs/elevenlabs-js';

const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY, // Defaults to 
});

const audio = await elevenlabs.textToSpeech.convert(
  'JBFqnCBsd6RMkjVDRZzb', // voice_id
  {
    text: 'The first move is what sets everything in motion.',
    modelId: 'eleven_multilingual_v2',
    outputFormat: 'mp3_44100_128', // output_format
  }
);

await play(audio);
```