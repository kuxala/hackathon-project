import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
})

export interface VoiceConversationOptions {
  agentId?: string
  voiceId?: string
  firstMessage?: string
}

export interface ConversationSession {
  conversationId: string
  agentId: string
}

/**
 * Start a new ElevenLabs Conversational AI session
 * This creates a conversational agent that can handle full voice conversations
 */
export async function startConversation(
  userId: string,
  options?: VoiceConversationOptions
): Promise<ConversationSession> {
  try {
    // For ElevenLabs Conversational AI, we use their conversational endpoint
    // The agent ID should be configured in your ElevenLabs dashboard
    const agentId = options?.agentId || process.env.ELEVENLABS_AGENT_ID || 'default'

    // Generate a unique conversation ID
    const conversationId = `conv_${userId}_${Date.now()}`

    return {
      conversationId,
      agentId
    }
  } catch (error) {
    console.error('Failed to start conversation:', error)
    throw new Error('Failed to initialize voice conversation')
  }
}

/**
 * Convert audio blob to text using ElevenLabs STT
 */
export async function speechToText(_audioBuffer: Buffer): Promise<string> {
  try {
    // ElevenLabs doesn't have a direct STT endpoint in their SDK
    // We'll need to use their API directly or use Web Speech API on client
    // For now, we'll use a placeholder that should be replaced with actual implementation

    // Option 1: Use ElevenLabs API directly (if they provide STT)
    // Option 2: Use OpenAI Whisper API
    // Option 3: Use Web Speech API on client side

    throw new Error('STT implementation required - use Web Speech API on client or integrate Whisper')
  } catch (error) {
    console.error('Speech to text error:', error)
    throw error
  }
}

/**
 * Convert text to speech using ElevenLabs TTS
 * Returns audio buffer that can be played on the client
 */
export async function textToSpeech(
  text: string,
  voiceId?: string
): Promise<Buffer> {
  try {
    const selectedVoiceId = voiceId || 'JBFqnCBsd6RMkjVDRZzb' // Default voice

    const audio = await elevenlabs.textToSpeech.convert(
      selectedVoiceId,
      {
        text,
        modelId: 'eleven_multilingual_v2',
        outputFormat: 'mp3_44100_128'
      }
    )

    // Convert the audio stream to a buffer
    const chunks: Uint8Array[] = []
    const reader = audio.getReader()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) chunks.push(value)
      }
    } finally {
      reader.releaseLock()
    }

    return Buffer.concat(chunks)
  } catch (error) {
    console.error('Text to speech error:', error)
    throw new Error('Failed to convert text to speech')
  }
}

/**
 * Process a complete voice interaction:
 * 1. Convert speech to text
 * 2. Get AI response using existing chat service
 * 3. Convert response to speech
 */
export interface VoiceInteractionResult {
  transcript: string
  responseText: string
  audioBuffer: Buffer
}

export async function processVoiceInteraction(
  _audioBuffer: Buffer,
  _userId: string,
  _conversationHistory: any[],
  _userContext?: any
): Promise<VoiceInteractionResult> {
  try {
    // This is a simplified flow - actual implementation will depend on
    // whether we use client-side STT or server-side

    // For now, we'll expect the transcript to be provided from client
    // and focus on the TTS part

    throw new Error('Use separate STT and TTS endpoints')
  } catch (error) {
    console.error('Voice interaction error:', error)
    throw error
  }
}

const elevenlabsService = {
  startConversation,
  speechToText,
  textToSpeech,
  processVoiceInteraction
}

export default elevenlabsService
