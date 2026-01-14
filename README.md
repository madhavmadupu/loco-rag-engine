# 🚀 LOCO RAG Engine
### **Local-Only Contextual Orchestration**
*A production-grade, privacy-first Retrieval-Augmented Generation (RAG) system that runs entirely on your hardware.*

[![Python](https://img.shields.io/badge/Python-3.10+-blue?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Ollama](https://img.shields.io/badge/Ollama-Local_LLM-orange?style=for-the-badge)](https://ollama.com)

---

## 🎯 The Vision
**LOCO** (Local-Only Contextual Orchestration) is designed for organizations and individuals who need the power of RAG without the privacy risks or costs of cloud-based LLMs. 

By combining **FastAPI**, **Next.js 15**, and **LanceDB**, LOCO provides a "chat-with-your-docs" experience that is 100% air-gapped ready.

### ✨ Key Features
*   🔒 **Zero Data Leaks**: Your documents and queries never leave your local machine.
*   🧠 **Semantic Chunking**: Intelligent document splitting that understands topic shifts (not just character counts).
*   🔍 **Hybrid Retrieval**: Combines vector similarity with keyword matching via LanceDB.
*   📚 **Verified Citations**: Every response includes clickable references to the exact source text.
*   ⚡ **Single-Command Startup**: A custom `run.py` script manages the backend, frontend, and environment for you.

## 🏗️ System Architecture
LOCO RAG Engine operates on a decoupled client-server model designed for 100% local execution.

<img width="2485" height="1455" alt="image" src="https://github.com/user-attachments/assets/7570361d-c976-4a10-9137-fd6f34352594" />


---

## 🏗️ Tech Stack
| Layer | Technology | Role |
| :--- | :--- | :--- |
| **LLM** | Ollama (`llama3.2`) | Local reasoning engine |
| **Embeddings** | Ollama (`nomic-embed-text`) | Text-to-vector transformation |
| **Vector Store**| LanceDB | High-performance, embedded vector database |
| **Backend** | FastAPI | High-concurrency REST API |
| **Frontend** | Next.js 15 (App Router) | Modern, responsive Chat UI with Shadcn/UI |

---

## 🚀 Quick Start

### 1. Prerequisites
Ensure you have the following installed:
*   **Python 3.10+**
*   **Node.js 18+**
*   **Ollama** — [Download here](https://ollama.com)

### 2. Setup Models
Pull the required models via terminal:
```bash
ollama pull llama3.2
ollama pull nomic-embed-text
```

### 3. One-Click Launch
Clone the repo and run the orchestrator:
```bash
git clone https://github.com/yourusername/loco-rag-engine.git
cd loco-rag-engine
python run.py
```
*The script will automatically create a virtual environment, install dependencies, and launch both the API (Port 8000) and the UI (Port 3000).*

### 4. Services & Ports
Once running, the following services are available:
*   **Frontend UI**: [http://localhost:3000](http://localhost:3000)
*   **Backend API**: [http://localhost:8000](http://localhost:8000)
*   **API Documentation (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📂 Project Structure
```text
loco-rag-engine/
├── 📂 backend/           # FastAPI application & RAG logic
│   ├── 📂 core/          # Engine, Semantic Processor & Security
│   └── 📂 data/          # Local LanceDB vector storage
├── 📂 frontend/          # Next.js 15 + Tailwind + Shadcn UI
│   ├── 📂 src/app/       # Chat and Admin routes
│   └── 📂 src/components/# UI components (Alerts, Buttons, etc.)
├── 📂 docs/              # Detailed technical documentation
├── 📄 run.py             # Main entry point / Process orchestrator
└── 📄 README.md          # You are here
```

---

## 📖 Deep Dive Documentation
| Topic | Description |
| :--- | :--- |
| [**Architecture**](docs/architecture.md) | How the Semantic Chunking and LanceDB integration works. |
| [**API Reference**](docs/api-reference.md) | Documentation for `/query`, `/ingest`, and `/admin` endpoints. |
| [**Deployment**](docs/deployment.md) | Deployment Guide. |
| [**Development**](docs/development.md) | How to contribute and extend the LOCO engine. |
| [**Frontend UI**](docs/frontend-ui.md) | Frontend UI Documentation. |
| [**Troubleshooting**](docs/troubleshooting.md) | Common issues with Ollama connectivity or PDF parsing. |

---

## 🤝 Contributing
We welcome contributions! Please see our [Development Guide](docs/development.md) for local setup instructions.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

---
<p align="center">Built with ❤️ for the Local-First AI Community</p>
