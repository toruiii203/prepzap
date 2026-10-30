# Studenius — Autonomous Cognitive Study Copilot & Active Recall Agent

> **Submission for the [Nebius x NVIDIA Global AI Hackathon](https://nebiusglobalaihackathon.devpost.com/)**  
> **Track:** Best Apps and Agents Track  
> **AI Backbone:** NVIDIA Nemotron Models hosted on **Nebius Token Factory** & **NVIDIA NIM**  
> **License:** [MIT License](./LICENSE)

---

## 🌟 Overview

**Studenius** is an agentic, gamified student learning copilot designed to eliminate passive reading and replace it with high-yield active retrieval. Powered by **NVIDIA Nemotron** models running on **Nebius Token Factory's** open, high-performance GPU infrastructure, Studenius transforms raw study notes, lecture syllabi, and PDFs into:

1. **Adaptive Retrieval & Scaffolding Quizzes**: Self-regulating quizzes that identify student blindspots in real-time, re-testing missed concepts with progressive cognitive cues.
2. **High-Yield Concept Distillation**: Leveraging Nemotron's 70B+ advanced reasoning to differentiate exam-critical principles from peripheral noise.
3. **Feynman Technique Voice/Chat Teaching**: An AI conversational evaluator that challenges students to explain complex concepts in plain language, grading clarity and pinpointing misconceptions.
4. **Multiplayer Knowledge Arenas**: Real-time peer quiz battles and daily academic challenges with verifiable leaderboards.
5. **Campus Vault**: A community note-sharing ecosystem with automated AI concept indexing.

---

## 🚀 How We Used Nebius Token Factory & NVIDIA Open Source Models

### 1. NVIDIA Nemotron (`nvidia/Llama-3.1-Nemotron-70B-Instruct-HF` & `nvidia/nemotron-3.5-bolt-e4b`)
Academic learning demands strict factual fidelity and complex multi-step reasoning. Traditional small models hallucinate when extracting nuanced biomedical, engineering, or legal terms. We utilized **NVIDIA Nemotron**:
- **Nemotron-70B / Ultra**: Deployed for deep syllabus synthesis, multi-turn Feynman conversational evaluations, and generating distractors that mirror real exam cognitive traps.
- **Nemotron-3.5-Bolt / Nano**: Used for fast, low-latency validation during interactive quiz sessions to keep the user interface instant and engaging.

### 2. Nebius Token Factory Acceleration
- **Open, High-Performance GPU Infrastructure**: Studenius connects to Nebius Token Factory via its OpenAI-compatible endpoint (`https://api.studio.nebius.ai/v1/chat/completions`).
- **Low-Latency Streaming**: Accelerated inference through Token Factory allows our adaptive recall loop to immediately generate custom re-tests without lag.
- **Dual-Failover Architecture**: Studenius implements an intelligent dual-routing adapter in `src/lib/nebius.ts` supporting both Nebius Token Factory and NVIDIA NIM inference.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Studenius React Frontend                  │
│       (Vite + TypeScript + Tailwind CSS + Neobrutalism)     │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
    [Local Practice / Arena / Notes]     [Active AI Tasks]
                │                             │
                ▼                             ▼
       ┌─────────────────┐           ┌────────────────────────────────┐
       │ Supabase DB/Auth│           │      src/lib/nebius.ts         │
       │ & Realtime Sync │           │  (Nebius Token Factory Engine) │
       └─────────────────┘           └──────────────┬─────────────────┘
                                                    │
                           ┌────────────────────────┴────────────────────────┐
                           ▼                                                 ▼
             ┌───────────────────────────┐                     ┌───────────────────────────┐
             │   Nebius Token Factory    │                     │        NVIDIA NIM         │
             │   (Nebius AI Cloud GPU)   │                     │ (Direct Inference Backup) │
             │  Llama-3.1-Nemotron-70B   │                     │     Nemotron-3.5-Bolt     │
             └───────────────────────────┘                     └───────────────────────────┘
```

---

## 🛠️ Quickstart & Reproduction

### Prerequisites
- Node.js 18+ & npm
- (Optional) Nebius Token Factory API Key or NVIDIA NIM API Key

### 1. Clone & Install
```bash
git clone https://github.com/toruiii203/prepzap.git
cd prepzap
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your configuration includes:
```env
# Nebius Token Factory
VITE_NEBIUS_API_URL=https://api.studio.nebius.ai/v1/chat/completions
VITE_NEBIUS_API_KEY=your_nebius_api_key_here
VITE_NEBIUS_MODEL=nvidia/Llama-3.1-Nemotron-70B-Instruct-HF

# NVIDIA NIM Fallback
VITE_NVIDIA_API_URL=https://integrate.api.nvidia.com/v1/chat/completions
VITE_NVIDIA_API_KEY=your_nvidia_api_key_here
VITE_NVIDIA_MODEL=nvidia/nemotron-3.5-bolt-e4b
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production
```bash
npm run build
```

---

## 📝 What Was Significantly Updated During the Submission Period

Per hackathon guidelines for existing codebases:
1. **Nebius Token Factory & NVIDIA Nemotron Integration**: Implemented `src/lib/nebius.ts`, wiring direct OpenAI-compatible communication with Nebius Token Factory and NVIDIA NIM inference.
2. **Agentic Adaptive Recall Engine**: Upgraded quiz generation to leverage Nemotron's structured reasoning capabilities for generating precise distraction options and cognitive hints.
3. **UI/UX Neobrutalist Refactor**: Cleaned up the practice and arena interfaces, eliminating visual clutter in favor of distraction-free, high-focus exam surfaces.
4. **Resilience & Offline Caching**: Added automatic recovery from network hiccups and cache invalidation policies ensuring uninterrupted study sessions.

---

## 💬 Feedback on Nebius Token Factory & NVIDIA Tools

- **What Worked Well**:
  - **OpenAI-Compatible Standard**: Nebius Token Factory adopting standard REST/OpenAI endpoints meant zero SDK lock-in; we could write a single clean adapter in under 50 lines of TypeScript.
  - **Nemotron Quality**: NVIDIA's `nemotron-3.5-bolt-e4b` and `Llama-3.1-Nemotron-70B` demonstrated remarkable discipline with structured JSON outputs and complex multi-turn student evaluation prompts.
  - **CORS Support**: Nebius having `access-control-allow-origin: *` configured on inference endpoints enables seamless modern web app integration.
- **Constructive Feedback & Friction Points**:
  - **Billing & Geographic Availability**: As international participants participating globally, Nebius's billing verification currently restricts several country codes (e.g. Philippines / Southeast Asia) from completing credit card authorizations. Providing coupon code redemption directly during signup without requiring an initial payment card authorization would enable friction-free access for builders worldwide.

---

## 📄 License
This project is open-source under the [MIT License](./LICENSE).
