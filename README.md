<div align="center">

# Axly DSA Tracker

**Production-oriented DSA learning platform combining structured practice, competitive Daily Challenges, and AI coaching.**

[![Tests](https://img.shields.io/badge/tests-306%20passed-brightgreen?style=flat-square)](#-testing)
[![Languages](https://img.shields.io/badge/languages-JS%20%7C%20Python%20%7C%20TS%20%7C%20Java%20%7C%20C%20%7C%20C++-blue?style=flat-square)](#-code-execution)
[![Stack](https://img.shields.io/badge/stack-Node.js%20%7C%20React%20%7C%20PostgreSQL-informational?style=flat-square)](#-technology-stack)

**Production:** `https://dsatracker.axly.in`  
**Repository:** `https://github.com/Ravikiran9988/axly-dsa-tracker`

</div>

---

## 📸 Product Preview

<div align="center">

### Dashboard & Daily Challenge Widget
<img src="docs/screenshots/dashboard.png" width="600" alt="Dashboard" />

### 80-Problem Practice Library
<img src="docs/screenshots/practice.png" width="600" alt="Practice" />

### Problem Workspace + AI Coach
<img src="docs/screenshots/dsa-ai.png" width="600" alt="DSA AI" />

### Competitive Daily Challenge
<img src="docs/screenshots/daily-challenge.png" width="600" alt="Daily Challenge" />

### Progress Analytics
<img src="docs/screenshots/progress.png" width="600" alt="Progress" />

### Mobile Responsive Design
<img src="docs/screenshots/mobile.png" width="250" alt="Mobile" />

</div>

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/Ravikiran9988/axly-dsa-tracker.git
cd axly-dsa-tracker

# Install dependencies
cd backend && npm install
cd ../frontend && npm install
```

### 2. Environment Variables
Create a `.env` file in `backend/`:
```env
PORT=5000
JWT_SECRET=your_secret_key
FRONTEND_URL=http://localhost:5173

# Groq Multi-Key Setup for AI
GROQ_API_KEY_1=your_first_groq_key
```

### 3. Setup & Run
```bash
cd backend
npm run db:setup
npm run dev

# Open new terminal
cd frontend
npm run dev
```

---

## 🛠️ Core Features

- **Practice Library**: 80 curated DSA problems across 8 topics (Arrays, Trees, DP, etc).
- **Daily Challenge**: UTC-synchronized daily competitive problem with global leaderboards.
- **DSA AI Coach**: Context-aware AI tutor with deterministic Knowledge Graph checking and Groq API failovers.
- **Code Execution**: Secure sandboxed subprocesses for JS, Python, TS, Java, C, and C++.

## 🏗️ Technology Stack

- **Frontend**: React 18, Vite, TailwindCSS
- **Backend**: Node.js, Express, SQLite/PostgreSQL
- **AI Engine**: Groq + Custom Context Router
- **Testing**: Jest (306 passing backend tests) + Playwright (E2E)

---

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
