This documentation outlines the complete implementation of **LOCO RAG Engine** (Local-Only Contextual Orchestration). This setup prioritizes speed, ease of installation, and high-quality retrieval using 2025's best practices.

### 1. The "LOCO" Tech Stack
*   **LLM & Embeddings:** [Ollama](https://ollama.com/) (Models: `llama3.2` for reasoning, `nomic-embed-text` for vectors).
*   **Vector Database:** [LanceDB](https://lancedb.com/) (Embedded, serverless, high-performance).
*   **Backend:** FastAPI (Python 3.10+).
*   **Frontend:** Next.js 15 + Tailwind CSS + Shadcn/UI.
*   **Chunking Strategy:** **Semantic Chunking** (New for 2025: Splits text based on topic shifts rather than character counts).

---

### 2. Project Architecture
```text
loco-rag-engine/
├── backend/
│   ├── main.py             # FastAPI App & Endpoints
│   ├── core/
│   │   ├── engine.py       # RAG logic (LanceDB + Ollama)
│   │   ├── security.py     # Local Admin hashing/JWT
│   │   └── processor.py    # Semantic Chunking logic
│   ├── data/               # Vector & SQLite storage
│   └── requirements.txt
├── frontend/
│   ├── src/app/            # Next.js Pages
│   └── ...
└── run.py                  # Single-click "Out of the box" launcher
```

---

### 3. Backend Implementation

#### A. Requirements (`backend/requirements.txt`)
```text
fastapi
uvicorn
lancedb
ollama
pypdf
python-multipart
passlib[bcrypt]
python-jose[cryptography]
numpy
```

#### B. The LOCO Engine (`backend/core/engine.py`)
This handles the local vector database using LanceDB and hybrid retrieval.

```python
import lancedb
import ollama
import os

DB_URI = "backend/data/loco_vectors"

class LocoEngine:
    def __init__(self):
        self.db = lancedb.connect(DB_URI)
        self.table_name = "doc_store"
        
    def get_embedding(self, text: str):
        resp = ollama.embeddings(model="nomic-embed-text", prompt=text)
        return resp['embedding']

    def ingest(self, chunks: list, metadata: dict):
        # Create table if not exists
        data = []
        for chunk in chunks:
            data.append({
                "vector": self.get_embedding(chunk),
                "text": chunk,
                "source": metadata['filename'],
                "page": metadata.get('page', 0)
            })
        
        if self.table_name not in self.db.table_names():
            self.db.create_table(self.table_name, data=data)
        else:
            table = self.db.open_table(self.table_name)
            table.add(data)

    def query(self, user_input: str, top_k: int = 3):
        table = self.db.open_table(self.table_name)
        query_vec = self.get_embedding(user_input)
        
        # LanceDB Vector Search
        results = table.search(query_vec).limit(top_k).to_list()
        
        context = "\n---\n".join([r['text'] for r in results])
        
        prompt = f"""Use the provided context to answer the question. 
        If the answer is not in the context, say you don't know. 
        Provide citations like [Source: filename].
        
        Context: {context}
        Question: {user_input}
        """
        
        response = ollama.generate(model="llama3.2", prompt=prompt, stream=False)
        
        # Return Answer + References
        return {
            "answer": response['response'],
            "references": [
                {"source": r['source'], "snippet": r['text'][:150], "score": r['_distance']} 
                for r in results
            ]
        }
```

#### C. Semantic Chunking (`backend/core/processor.py`)
*New Suggestion:* Instead of `text_splitter`, we use similarity to find where a "thought" ends.

```python
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

def semantic_chunking(text, engine: LocoEngine):
    sentences = text.split('. ')
    embeddings = [engine.get_embedding(s) for s in sentences]
    
    chunks = []
    current_chunk = [sentences[0]]
    
    for i in range(1, len(sentences)):
        # Calculate similarity between consecutive sentences
        sim = cosine_similarity([embeddings[i-1]], [embeddings[i]])[0][0]
        
        if sim < 0.7:  # Threshold: New topic detected
            chunks.append(". ".join(current_chunk))
            current_chunk = [sentences[i]]
        else:
            current_chunk.append(sentences[i])
            
    chunks.append(". ".join(current_chunk))
    return chunks
```

---

### 4. Frontend Implementation (Next.js 15)

#### A. The API Client Service (`frontend/src/lib/api.ts`)
```typescript
const BASE_URL = "http://localhost:8000";

export const locoApi = {
  async ask(query: string) {
    const res = await fetch(`${BASE_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    return res.json();
  },
  async upload(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${BASE_URL}/ingest`, { method: 'POST', body: formData });
  }
};
```

#### B. The Chat UI (`frontend/src/app/chat/page.tsx`)
Using Tailwind and a clean "Reference List" layout.

```tsx
"use client"
import { useState } from "react";
import { locoApi } from "@/lib/api";

export default function LocoChat() {
  const [messages, setMessages] = useState<{role: string, content: any}[]>([]);
  const [input, setInput] = useState("");

  const onSend = async () => {
    const userMsg = { role: "user", content: input };
    setMessages([...messages, userMsg]);
    
    const data = await locoApi.ask(input);
    setMessages(prev => [...prev, { role: "assistant", content: data }]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white p-6">
      <div className="flex-1 overflow-y-auto space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`p-4 rounded-lg ${m.role === 'user' ? 'bg-zinc-800' : 'bg-blue-900/20 border border-blue-500/30'}`}>
            <p>{m.role === 'user' ? m.content : m.content.answer}</p>
            {m.role === 'assistant' && (
              <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
                {m.content.references.map((ref: any, j: number) => (
                  <span key={j} className="text-xs bg-zinc-800 p-1 rounded px-2 opacity-70">
                    📄 {ref.source}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-4">
        <input 
           className="bg-zinc-900 border border-zinc-800 rounded px-4 py-2 w-full outline-none"
           value={input}
           onChange={(e) => setInput(e.target.value)}
        />
        <button onClick={onSend} className="bg-blue-600 px-6 py-2 rounded font-bold">ASK</button>
      </div>
    </div>
  );
}
```

---

### 5. "Out-of-the-Box" Orchestration (`run.py`)
This script ensures everything starts with one command. 

```python
import subprocess
import os
import sys

def check_ollama():
    try:
        subprocess.check_output(["ollama", "--version"])
    except:
        print("Error: Ollama not found. Please install it from ollama.com")
        sys.exit(1)

def run():
    # 1. Start FastAPI in background
    print("🚀 Starting LOCO Backend...")
    backend_proc = subprocess.Popen(["uvicorn", "backend.main:app", "--port", "8000"])

    # 2. Start Next.js (assuming it's built or in dev mode)
    print("🎨 Starting LOCO UI...")
    frontend_proc = subprocess.Popen(["npm", "run", "dev"], cwd="frontend")

    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        backend_proc.terminate()
        frontend_proc.terminate()

if __name__ == "__main__":
    check_ollama()
    run()
```

### 6. Suggested Feature: "Hybrid Search"
To make it professional, implement **Hybrid Search** in LanceDB. Vector search finds "contextual" meaning, but Keyword (BM25) search finds exact technical terms (like serial numbers or specific error codes). 

In LanceDB 2025, you can do this easily:
```python
# In backend/core/engine.py
def hybrid_query(self, text):
    table = self.db.open_table(self.table_name)
    # This automatically combines vector similarity and keyword search
    return table.search(text, query_type="hybrid").limit(3).to_list()
```

### 7. How to deploy to the user
1.  **Frontend:** Run `npm run build` in the frontend folder. Use a simple static server (like `serve`) or let FastAPI serve the static Next.js files from the `/out` directory.
2.  **Backend:** Use **PyInstaller** to bundle the Python environment.
3.  **Setup Wizard:** On first run, the app should call `ollama pull llama3.2` and `ollama pull nomic-embed-text` automatically.