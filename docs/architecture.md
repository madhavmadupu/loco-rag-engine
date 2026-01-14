# Architecture Overview

This document describes the system architecture of LOCO RAG Engine.

## System Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LOCO RAG Engine                             │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    HTTP/REST    ┌────────────────────────────┐   │
│  │  Next.js 15  │◄───────────────►│     FastAPI Backend        │   │
│  │   Frontend   │                  │                            │   │
│  └──────────────┘                  │  ┌────────────────────┐   │   │
│                                    │  │    LocoEngine       │   │   │
│                                    │  ├────────────────────┤   │   │
│                                    │  │ • get_embedding()  │   │   │
│                                    │  │ • ingest()         │   │   │
│                                    │  │ • query()          │   │   │
│                                    │  └─────────┬──────────┘   │   │
│                                    │            │              │   │
│                                    │  ┌─────────▼──────────┐   │   │
│                                    │  │     LanceDB        │   │   │
│                                    │  │ (Vector Storage)   │   │   │
│                                    │  └────────────────────┘   │   │
│                                    └────────────┬──────────────┘   │
│                                                 │                  │
│                                    ┌────────────▼──────────────┐   │
│                                    │         Ollama            │   │
│                                    │  • llama3.2 (generation)  │   │
│                                    │  • nomic-embed-text       │   │
│                                    └───────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Document Ingestion

1. User uploads PDF/text file via frontend
2. Backend receives file at `/ingest` endpoint
3. `processor.py` extracts text and performs semantic chunking
4. `engine.py` generates embeddings via Ollama
5. Vectors stored in LanceDB with metadata

### Query Processing

1. User submits question via chat interface
2. Backend receives query at `/query` endpoint
3. Query text is embedded using Ollama
4. LanceDB performs vector similarity search
5. Top-k results retrieved as context
6. LLM generates answer with context
7. Response returned with source references

## Component Details

### Backend Core (`backend/core/`)

| Module | Responsibility |
|--------|----------------|
| `database.py` | LanceDB connection, config management, SQLite for auth |
| `engine.py` | RAG logic: embeddings, ingestion, query processing |
| `processor.py` | PDF extraction, semantic chunking |
| `security.py` | Password hashing, JWT tokens, auth helpers |

### Frontend (`frontend/src/`)

| Component | Purpose |
|-----------|---------|
| `/app/page.tsx` | Main chat interface |
| `/app/admin/page.tsx` | Admin dashboard, settings, file upload |
| `/lib/api.ts` | API client for backend communication |

## Storage

### LanceDB (Vector Storage)

- Location: `backend/data/loco_vectors/`
- Table: `doc_store`
- Schema: `{vector, text, source, page}`

### SQLite (Auth & Config)

- Location: `backend/data/loco.db`
- Tables: `admin`, `config`

## Security

- Admin password hashed with bcrypt
- JWT tokens for authenticated routes
- All authentication is local (no external services)
