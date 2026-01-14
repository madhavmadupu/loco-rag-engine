# Development Guide

This guide covers how to set up a development environment and contribute to LOCO RAG Engine.

## Prerequisites

- Python 3.10+
- Node.js 18+
- Ollama installed and running
- Git

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/loco-rag-engine.git
cd loco-rag-engine
```

### 2. Pull Ollama Models

```bash
ollama pull llama3.2
ollama pull nomic-embed-text
```

### 3. Backend Setup

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
```

### 4. Frontend Setup

```bash
cd frontend
npm install
```

### 5. Run Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## Code Style

### Python

Follow the [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html).

**Docstrings:**
```python
def semantic_chunking(text: str, threshold: float = 0.7) -> list[str]:
    """Split text into semantic chunks based on topic similarity.

    Uses cosine similarity between consecutive sentence embeddings
    to detect topic boundaries.

    Args:
        text: The input text to chunk.
        threshold: Similarity threshold for chunk boundaries.
            Values below this indicate a new topic. Defaults to 0.7.

    Returns:
        A list of text chunks, each representing a coherent topic.

    Raises:
        ValueError: If text is empty.
    """
```

**Type Hints:**
```python
from typing import Optional

def get_embedding(self, text: str) -> list[float]:
    ...
```

### TypeScript

Use ESLint with recommended settings. Document functions with JSDoc:

```typescript
/**
 * Submit a query to the RAG engine.
 * @param query - The user's question
 * @returns Promise containing answer and source references
 */
async function ask(query: string): Promise<QueryResponse> {
  ...
}
```

## Testing

### Backend Tests

```bash
cd backend
pytest tests/ -v
```

### Frontend Tests

```bash
cd frontend
npm test
```

## Commit Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance

**Examples:**
```
feat(engine): add hybrid search combining vector and keyword
fix(processor): handle empty PDF pages gracefully
docs(api): add examples for query endpoint
```

## Project Structure

```
backend/
├── core/
│   ├── database.py      # Database connections
│   ├── engine.py        # RAG engine logic
│   ├── processor.py     # Document processing
│   └── security.py      # Authentication
├── data/                # Runtime data (gitignored)
├── tests/               # Test files
├── main.py              # FastAPI app
└── requirements.txt

frontend/
├── src/
│   ├── app/             # Pages
│   ├── components/      # UI components
│   └── lib/             # Utilities
├── public/              # Static assets
└── package.json
```
