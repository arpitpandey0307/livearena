# 🎯 LiveArena - Real-time Multiplayer Quiz Platform

<div align="center">

![LiveArena Logo](https://img.shields.io/badge/LiveArena-Real--time%20Quiz%20Platform-blue?style=for-the-badge)

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Real--time-black?style=flat-square&logo=socket.io)](https://socket.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

**A real-time multiplayer quiz platform with AI-powered question generation**

[Features](#features) • [Demo](#demo) • [Installation](#installation) • [Usage](#usage) • [API](#api-documentation)

</div>

---

## 📖 Overview

LiveArena is a full-stack web application that enables users to create, host, and participate in live multiplayer quiz games. Built with modern technologies, it features real-time synchronization, AI-powered question generation, and a seamless user experience.

### 🎓 Project Context

This project was developed as part of a college continuous assessment to demonstrate:
- Full-stack web development capabilities
- Real-time communication using WebSockets
- AI integration for content generation
- Database design and persistence
- Modern UI/UX implementation

---

## ✨ Features

### Core Features

| Feature | Description |
|---------|-------------|
| 📝 **Manual Quiz Creation** | Build quizzes question by question with full control |
| 🤖 **AI Quiz Generation** | Generate quality questions from any topic using Gemini AI |
| 🎮 **Three Join Methods** | Room code, invitation link, or QR code scanning |
| ⚡ **Real-time Gameplay** | Synchronized questions, timers, and leaderboards |
| 🏆 **Live Leaderboard** | Real-time score updates and rankings |
| 💾 **MongoDB Persistence** | All quizzes and results permanently stored |
| 🚪 **Guest Access** | No registration required for participants |

### Technical Highlights

- **Server-Authoritative Scoring**: All score calculations happen on the backend
- **WebSocket Communication**: Real-time updates via Socket.IO
- **Responsive Design**: Works on desktop and mobile devices
- **QR Code Integration**: Easy room joining via QR scan
- **RESTful API**: Clean API design with proper validation
- **Type-Safe**: Full TypeScript implementation

---

## 🚀 Demo

### User Flow

```
┌─────────────┐
│ Create Quiz │ ──> Manual or AI Generated
└──────┬──────┘
       │
       v
┌─────────────┐
│ Host Room   │ ──> Get Code/Link/QR
└──────┬──────┘
       │
       v
┌─────────────┐
│ Join Room   │ ──> Enter Code or Scan QR
└──────┬──────┘
       │
       v
┌─────────────┐
│ Play Quiz   │ ──> Answer Questions
└──────┬──────┘
       │
       v
┌─────────────┐
│ View Results│ ──> Final Leaderboard
└─────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **Socket.IO Client** - Real-time communication
- **React Router** - Client-side routing
- **QRCode.react** - QR code generation
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **TypeScript** - Type-safe development
- **Socket.IO** - Real-time bidirectional communication
- **MongoDB Atlas** - Cloud database
- **Mongoose** - MongoDB object modeling
- **Zod** - Schema validation
- **nanoid** - Unique ID generation
- **Google Gemini AI** - Question generation

---

## 📦 Installation

### Prerequisites

- Node.js 18 or higher
- MongoDB Atlas account (or local MongoDB)
- Google Gemini API key

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/livearena.git
cd livearena
```

### Step 2: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Edit `backend/.env` with your credentials:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/livearena?retryWrites=true&w=majority

# AI Provider (Gemini)
AI_API_KEY=your_gemini_api_key_here
AI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
AI_MODEL=gemini-2.0-flash

# Frontend URL for CORS
FRONTEND_URL=http://localhost:5173
```

### Step 3: Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install
```

### Step 4: Run the Application

Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 5: Access the Application

Open your browser and navigate to: **http://localhost:5173**

---

## 🎮 Usage

### Creating a Quiz

1. **Manual Creation**
   - Click "Create Manually" on the landing page
   - Enter quiz title and description
   - Add questions with 4 options each
   - Select correct answers
   - Save the quiz

2. **AI Generation**
   - Click "Generate with AI"
   - Enter a topic (e.g., "JavaScript fundamentals")
   - Select difficulty level
   - Choose number of questions (1-30)
   - Review and edit generated questions
   - Save the quiz

### Hosting a Quiz

1. Navigate to your saved quiz
2. Click "Host Live Quiz"
3. Share the room code, link, or QR code with participants
4. Wait for participants to join
5. Click "Start Quiz" when ready

### Joining a Quiz

1. **Option 1**: Enter the 6-character room code
2. **Option 2**: Click the invitation link
3. **Option 3**: Scan the QR code
4. Enter your nickname
5. Wait for the host to start

### Playing the Quiz

- Questions appear with countdown timer
- Select your answer before time runs out
- See correct answers after each question
- Watch the live leaderboard update

---

## 📚 API Documentation

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/quizzes` | Create a new quiz |
| `GET` | `/api/quizzes/:id` | Get quiz by ID |
| `PUT` | `/api/quizzes/:id` | Update quiz |
| `DELETE` | `/api/quizzes/:id` | Delete quiz |
| `POST` | `/api/quizzes/ai/generate` | Generate quiz with AI |
| `POST` | `/api/rooms` | Create a room |
| `GET` | `/api/rooms/:code` | Get room info |
| `POST` | `/api/rooms/:code/join` | Join a room |
| `GET` | `/api/rooms/sessions/:id/results` | Get game results |

### Socket.IO Events

**Client → Server:**
- `room:join` - Join a room as participant
- `room:host-join` - Join as host
- `game:start` - Start the quiz
- `answer:submit` - Submit an answer
- `game:next-question` - Advance to next question

**Server → Client:**
- `room:joined` - Room join confirmation
- `room:state` - Current lobby state
- `game:started` - Game started notification
- `question:started` - New question broadcast
- `answer:accepted` / `answer:rejected` - Answer status
- `question:ended` - Question closed with correct answer
- `leaderboard:updated` - Updated rankings
- `game:completed` - Game finished with results

---

## 📁 Project Structure

```
livearena/
├── 📂 backend/                 # Node.js + Express + Socket.IO
│   ├── 📂 src/
│   │   ├── 📂 models/          # Mongoose models
│   │   │   ├── Quiz.ts
│   │   │   └── GameSession.ts
│   │   ├── 📂 routes/          # Express routes
│   │   │   ├── quiz.routes.ts
│   │   │   └── room.routes.ts
│   │   ├── 📂 services/        # Business logic
│   │   │   ├── quiz.service.ts
│   │   │   ├── room.service.ts
│   │   │   └── ai.service.ts
│   │   ├── 📂 game/            # Socket.IO game engine
│   │   │   └── GameManager.ts
│   │   ├── 📂 utils/           # Utilities
│   │   │   ├── validation.ts
│   │   │   └── response.ts
│   │   └── 📄 server.ts        # Main server
│   ├── 📄 package.json
│   ├── 📄 tsconfig.json
│   ├── 📄 .env.example
│   └── 📄 .env                 # ⚠️ Gitignored (secrets)
│
├── 📂 frontend/                # React + TypeScript + Vite
│   ├── 📂 src/
│   │   ├── 📂 pages/           # Page components
│   │   │   ├── LandingPage.tsx
│   │   │   ├── CreateQuiz.tsx
│   │   │   ├── AIGenerateQuiz.tsx
│   │   │   ├── QuizEditor.tsx
│   │   │   ├── HostLobby.tsx
│   │   │   ├── JoinRoom.tsx
│   │   │   ├── PlayerLobby.tsx
│   │   │   ├── GamePlay.tsx
│   │   │   └── Results.tsx
│   │   ├── 📂 hooks/           # Custom React hooks
│   │   │   └── useSocket.ts
│   │   ├── 📂 services/        # API client
│   │   │   └── api.ts
│   │   ├── 📄 App.tsx
│   │   ├── 📄 main.tsx
│   │   └── 📄 index.css
│   ├── 📄 index.html
│   ├── 📄 vite.config.ts
│   ├── 📄 tailwind.config.js
│   └── 📄 package.json
│
├── 📄 prd.md                   # Product Requirements Document
├── 📄 README.md                # This file
└── 📄 .gitignore               # Git ignore rules
```

---

## 🔒 Security Features

- ✅ API keys stored server-side only
- ✅ Host actions require server-issued token
- ✅ Correct answers hidden until question closes
- ✅ Input validation on all endpoints
- ✅ Environment variables for secrets
- ✅ No secrets in version control
- ✅ Server-authoritative scoring

---

## 🎯 Key Features Explained

### Real-Time Synchronization

All game events are synchronized in real-time using Socket.IO:
- Questions appear simultaneously for all players
- Timer countdown is synchronized
- Leaderboard updates instantly
- No page refresh needed

### AI Question Generation

Powered by Google Gemini AI:
- Generate questions on any topic
- Adjustable difficulty levels
- 1-30 questions per quiz
- Questions are editable before saving

### Server-Authoritative Architecture

Security and fairness guaranteed:
- All scoring done on the backend
- Clients cannot manipulate scores
- Timer enforcement on server
- Answer validation server-side

---

## 🌟 Screenshots

### Landing Page
Modern, intuitive landing page with clear actions

### Quiz Editor
Full-featured quiz editor with live preview

### Host Lobby
Share room via code, link, or QR code

### Gameplay
Real-time quiz with synchronized timer

### Results
Final leaderboard with detailed statistics

---

## 📝 License

This project is developed for educational purposes as part of a college continuous assessment.

---

## 👨‍💻 Author

**Arpit Pandey**
- GitHub: [@ArpitPandey0310](https://github.com/ArpitPandey0310)
- Email: arkanix0703@gmail.com

---

## 🙏 Acknowledgments

- Built following comprehensive PRD guidelines
- Implements all P0 (Priority 0) requirements
- Follows modern web development best practices
- Demonstrates full-stack engineering capabilities

---

<div align="center">

**⭐ If you found this project helpful, please give it a star! ⭐**

Made with ❤️ by Arpit Pandey

</div>
