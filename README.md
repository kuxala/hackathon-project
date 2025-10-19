# 🧠 AI Financial Assistant

**Your personal voice-enabled finance copilot.**
Upload your bank statements or Excel sheets, and let AI handle the rest —
analyzing transactions, predicting expenses, and chatting with you about your money.

---

## 🚀 Features

- 📊 **Dashboard** – Visual overview of income, expenses, and categories
- 🧾 **Smart Statement Parser** – Reads Georgian & English PDFs automatically using AI
- 🤖 **AI Insights** – Detects spending patterns and highlights key trends
- 🔮 **Predictions** – Forecasts future expenses based on your historical data
- 💬 **Chatbot & Voice Assistant** – Ask questions about your finances, get instant AI-powered answers
- 🎙️ **Jarvis Mode** – Hands-free voice control for your entire dashboard
- 👤 **Profile Page** – Manage connected banks & preferences
- 🔐 **Login with Google or Email** – Fast, simple authentication

---

## 🤖 AI Models & APIs

We use cutting-edge AI technology to power the financial assistant:

- **OpenRouter API** – Provides access to multiple large language models for intelligent conversation, financial analysis, and personalized insights
- **ElevenLabs API** – Powers natural-sounding voice responses, making interactions feel like talking to a real financial advisor
- **Web Speech API** – Enables voice input recognition for hands-free control

---

## 🎙️ How Jarvis Mode Works

Jarvis is your voice-controlled financial assistant. Here's how it works:

1. **Activate with Voice** – Simply say "Hey Jarvis" or click the microphone button
2. **Speak Naturally** – Ask questions like "What did I spend on groceries last month?" or give commands like "Show me my biggest expenses"
3. **AI Processing** – Your speech is converted to text, analyzed by AI through OpenRouter, and the assistant understands your intent
4. **Voice Response** – The answer is spoken back to you using ElevenLabs' natural voice technology
5. **Dashboard Control** – Jarvis can navigate your dashboard, pull up charts, and display relevant data based on your voice commands

All of this happens in real-time, creating a seamless conversational experience with your financial data.

---

## 🛠️ Tech Stack

- **Frontend:** Next.js (TypeScript), TailwindCSS
- **Backend:** Node.js + Express
- **AI Models:** Accessed via OpenRouter API (multiple LLM options)
- **Voice:** ElevenLabs (text-to-speech) + Web Speech API (speech recognition)
- **Auth:** NextAuth (Google OAuth + Email)
- **Database:** PostgreSQL / Supabase

---

## ⚙️ Setup

```bash
git clone https://github.com/yourusername/ai-financial-assistant.git
cd ai-financial-assistant
npm install
npm run dev


OPENROUTER_API_KEY=your_key_here
ELEVENLABS_API_KEY=your_key_here
NEXTAUTH_GOOGLE_CLIENT_ID=your_id
NEXTAUTH_GOOGLE_CLIENT_SECRET=your_secret
