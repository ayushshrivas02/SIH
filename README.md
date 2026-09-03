# Sovereign AI Workbench

Private AI for confidential industrial work.

## Project Overview

Sovereign AI Workbench is a secure, modern, enterprise-style AI application that enables industrial organizations to use generative AI and agentic capabilities on confidential documents and data without making external cloud AI services mandatory.

## Problem Statement

Industrial organizations work with highly sensitive information (maintenance manuals, safety SOPs, inspection records, etc.). Sending such information to third-party cloud AI services creates severe privacy, security, and data-sovereignty concerns. This system allows you to:
- Plan. Analyze. Retrieve. Execute. Verify. Generate — within your controlled AI environment.

## Target Users

1. **Industrial Engineers**: Analyze manuals and reports.
2. **Maintenance Teams**: Investigate problems and SOPs.
3. **Inspection Teams**: Analyze photos and visual inspection logs.
4. **Data Analysts**: Process CSV/Excel sensor data.
5. **Managers**: Review AI-assisted generated reports.
6. **Administrators**: Monitor the sovereignty status and audit logs.

## Features & Architecture

The application is built as a single, lightweight Next.js (App Router) monolithic codebase.

### AI Model Architecture
- **Provider Abstraction**: Interacts with local AI via Ollama endpoints.
- **Supported Models**: Qwen/Llama/Mistral for reasoning, Qwen-VL/Llava for vision, Nomic-Embed/BGE for vector embeddings.

### RAG Pipeline
Supports file ingestion (PDF, CSV, TXT), chunking, semantic embedding using `pgvector`, and source-verifiable generation.

### Agent Architecture
Executes multi-step plans using tool augmentation (Vision, RAG, Data Analysis) and creates summarized verified reports.

### Data Sovereignty & Audit
Dashboard tracks internal vs external API calls. Every action is recorded in an immutable PostgreSQL audit log.

## Technology Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, shadcn/ui, Lucide Icons, Recharts
- **Backend**: Next.js Route Handlers, Prisma ORM
- **Database**: PostgreSQL (with pgvector)
- **AI Integration**: Vercel AI SDK, Ollama

---

## Getting Started

### Local Setup (Development)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Database Setup:**
   Ensure you have PostgreSQL running with the `pgvector` extension. You can use the provided docker-compose:
   ```bash
   docker-compose up -d
   ```
   Generate Prisma Client and apply migrations:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. **Configure Environment:**
   Create a `.env.local` file:
   ```env
   DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/sovereign_ai?schema=public"
   AI_PROVIDER="ollama"
   OLLAMA_BASE_URL="http://127.0.0.1:11434"
   ```

4. **Start Application:**
   ```bash
   npm run dev
   ```

### On-Premise Deployment

For true sovereign operation:
1. Deploy Next.js build (`npm run build && npm run start`) on a local intranet server.
2. Spin up a local Ollama instance containing the necessary models (`qwen2.5`, `llava`, `nomic-embed-text`).
3. Connect the application strictly to the local endpoints.

### Vercel Deployment

You can deploy the web orchestration layer to Vercel, but note:
> **Vercel does not provide true air-gapped/on-premise local model inference.**
To utilize this effectively on Vercel, configure `OLLAMA_BASE_URL` to point to an accessible server running your models, or implement standard cloud AI endpoints via the AI Provider abstraction.

## Hackathon Demo Instructions

1. Register an account (First user is automatically an ADMIN).
2. Go to **Settings** and ensure provider is active.
3. Upload documents via the **Documents** page.
4. Run RAG operations inside the **Knowledge Base**.
5. Go to **Vision Inspection** to analyze images.
6. Upload a sensor CSV in **Data Analysis** to see deterministic stats + AI insights.
7. Navigate to **Agents** and trigger the Industrial Inspection Agent.
8. Review the final generated artifact in **Reports**.
9. See all actions logged in **Audit & Security**.

---
*Disclaimer: AI-generated recommendations are decision-support outputs and should be reviewed by qualified personnel before operational use.*
