# 🧠 AI Financial Assistant

**Your personal voice-enabled finance copilot.**  
Upload your bank statements or Excel sheets, and let AI handle the rest —  
analyzing transactions, predicting expenses, and chatting with you about your money.

---

## 🚀 Features

- 📊 **Dashboard** – Visual overview of income, expenses, and categories  
- 🧾 **Smart Statement Parser** – Reads Georgian & English PDFs automatically  
- 🤖 **AI Insights** – Detects spending patterns and highlights key trends  
- 🔮 **Predictions** – Forecasts future expenses based on past data  
- 💬 **Chatbot & Voice Assistant** – Ask anything, get instant answers  
- 🎙️ **Jarvis Mode** – Control your dashboard using voice commands  
- 👤 **Profile Page** – Manage connected banks & preferences  
- 🔐 **Login with Google or Email** – Fast, simple authentication  

---

## 🛠️ Tech Stack

- **Frontend:** Next.js (TypeScript), TailwindCSS  
- **Backend:** Node.js + Express / FastAPI (depending on setup)  
- **AI:** OpenAI / Together AI (for chat + analysis)  
- **Auth:** NextAuth (Google OAuth + Email)  
- **Speech:** ElevenLabs + Web Speech API  
- **Storage:** PostgreSQL / Supabase  

---

## ⚙️ Setup

```bash
git clone https://github.com/yourusername/ai-financial-assistant.git
cd ai-financial-assistant
npm install
npm run dev


OPENAI_API_KEY=your_key_here
ELEVENLABS_API_KEY=your_key_here
NEXTAUTH_GOOGLE_CLIENT_ID=your_id
NEXTAUTH_GOOGLE_CLIENT_SECRET=your_secret
