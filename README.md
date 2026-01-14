<p align="center">
  <h1 align="center">🚀 LOCO RAG Engine</h1>
  <p align="center">
    <strong>Local-Only Contextual Orchestration</strong><br/>
    A production-ready, local-first RAG system for private document Q&A
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3.10+-blue?style=flat-square&logo=python" alt="Python"/>
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/Ollama-local-orange?style=flat-square" alt="Ollama"/>
  <img src="https://img.shields.io/badge/LanceDB-embedded-purple?style=flat-square" alt="LanceDB"/>
</p>

---

## 🎯 Overview

LOCO RAG Engine is a **fully local**, privacy-first Retrieval-Augmented Generation (RAG) system. Upload your documents, ask questions, and get accurate answers with source citations—all without sending data to external servers.

### Key Features

- 🔒 **100% Local**: All processing happens on your machine. No cloud dependencies.
- 📄 **Multi-Format Support**: Ingest PDFs and text files with automatic processing.
- 🧠 **Semantic Chunking**: Intelligent document splitting based on topic boundaries (not arbitrary character limits).
- 🔍 **Hybrid Search**: Combines vector similarity with keyword matching for optimal retrieval.
- 📚 **Source Citations**: Every answer includes clickable references to source documents.
- ⚡ **One-Click Launch**: Single command starts the entire stack.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        LOCO RAG Engine                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐        ┌─────────────────────────────┐  │
│  │   Next.js 15    │◄──────►│       FastAPI Backend       │  │
│  │   Frontend      │  REST  │                             │  │
│  │                 │        │  ┌───────────────────────┐  │  │
│  │  • Chat UI      │        │  │    LOCO Engine        │  │  │
│  │  • Admin Panel  │        │  │  • Semantic Chunking  │  │  │
│  │  • File Upload  │        │  │  • Vector Search      │  │  │
│  └─────────────────┘        │  │  • LLM Integration    │  │  │
│                             │  └───────────┬───────────┘  │  │
│                             │              │              │  │
│                             │  ┌───────────▼───────────┐  │  │
│                             │  │      LanceDB          │  │  │
│                             │  │  (Embedded Vectors)   │  │  │
│                             │  └───────────────────────┘  │  │
│                             └─────────────────────────────┘  │
│                                          │                   │
│                             ┌────────────▼────────────┐      │
│                             │        Ollama           │      │
│                             │  • llama3.2 (LLM)       │      │
│                             │  • nomic-embed-text     │      │
│                             └─────────────────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

1. **Python 3.10+**
2. **Node.js 18+**
3. **Ollama** - [Install from ollama.com](https://ollama.com)

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/loco-rag-engine.git
cd loco-rag-engine

# Pull required Ollama models
ollama pull llama3.2
ollama pull nomic-embed-text

# Run the application
python run.py
```

The application will automatically:
- Set up the Python virtual environment
- Install dependencies
- Start the backend server (port 8000)
- Start the frontend (port 3000)
- Open your browser to `http://localhost:3000`

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System design and component overview |
| [API Reference](docs/api-reference.md) | Complete API endpoint documentation |
| [Development](docs/development.md) | Developer setup and contribution guide |
| [Deployment](docs/deployment.md) | Production deployment instructions |
| [Troubleshooting](docs/troubleshooting.md) | Common issues and solutions |

---

## 🛠️ Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **LLM** | Ollama (llama3.2) | Local language model for Q&A |
| **Embeddings** | Ollama (nomic-embed-text) | Text-to-vector conversion |
| **Vector DB** | LanceDB | Embedded, serverless vector storage |
| **Backend** | FastAPI | High-performance REST API |
| **Frontend** | Next.js 15 | React-based web interface |
| **Styling** | Tailwind CSS + Shadcn/UI | Modern, accessible UI components |

---

## 📁 Project Structure

```
loco-rag-engine/
├── backend/
│   ├── core/
│   │   ├── database.py      # LanceDB connection & config
│   │   ├── engine.py        # RAG engine (embed, search, generate)
│   │   ├── processor.py     # PDF extraction & semantic chunking
│   │   └── security.py      # Authentication & JWT
│   ├── data/                # Vector DB & SQLite storage
│   ├── main.py              # FastAPI application
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── app/             # Next.js pages
│       └── lib/             # API client & utilities
├── docs/                    # Documentation
├── run.py                   # One-click launcher
└── README.md
```

---

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/ingest` | POST | Upload and process documents |
| `/query` | POST | Ask questions and get answers |
| `/admin/setup` | POST | Initial admin password setup |
| `/admin/login` | POST | Authenticate and get JWT |
| `/admin/config` | GET/POST | View/update settings |

See [API Reference](docs/api-reference.md) for detailed documentation.

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit changes following conventional commits (`git commit -m 'feat: add amazing feature'`)
4. Push to your branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

### Code Style

- **Python**: Follow [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)
- **TypeScript**: Use ESLint with recommended rules
- All functions must have docstrings/JSDoc comments

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## ⭐ Acknowledgments

- [Ollama](https://ollama.com) for making local LLMs accessible
- [LanceDB](https://lancedb.com) for the embedded vector database
- [FastAPI](https://fastapi.tiangolo.com) for the high-performance backend framework
- [Next.js](https://nextjs.org) for the React framework
