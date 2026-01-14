# Troubleshooting

Common issues and solutions for LOCO RAG Engine.

## Ollama Issues

### "Ollama not found"

**Symptom:** `Error: Ollama not found. Please install it from ollama.com`

**Solution:**
1. Install Ollama from [ollama.com](https://ollama.com)
2. Ensure Ollama is running: `ollama serve`
3. Verify with: `ollama --version`

---

### "Model not found"

**Symptom:** `Error pulling model "llama3.2"`

**Solution:**
```bash
# List available models
ollama list

# Pull required models
ollama pull llama3.2
ollama pull nomic-embed-text
```

---

### Slow Response Times

**Symptom:** Queries take 30+ seconds

**Causes & Solutions:**
1. **First query is slow**: Model loading into memory. Subsequent queries are faster.
2. **Insufficient RAM**: Ensure 8+ GB available RAM
3. **CPU-only inference**: Ollama is faster with GPU. Check GPU detection:
   ```bash
   ollama run llama3.2 "test"
   ```

## Backend Issues

### Port Already in Use

**Symptom:** `Address already in use`

**Solution:**
```bash
# Find process using port 8000
netstat -ano | findstr :8000

# Kill the process (Windows)
taskkill /PID <pid> /F
```

---

### LanceDB Connection Error

**Symptom:** `Failed to connect to LanceDB`

**Solution:**
1. Ensure `backend/data/` directory exists and is writable
2. Delete corrupted database:
   ```bash
   rm -rf backend/data/loco_vectors
   ```

## Frontend Issues

### API Connection Failed

**Symptom:** `Failed to fetch` or CORS errors

**Solution:**
1. Verify backend is running on port 8000
2. Check browser console for specific error
3. Clear browser cache

---

### Blank Page

**Symptom:** Frontend shows blank page

**Solution:**
```bash
cd frontend
rm -rf .next node_modules
npm install
npm run dev
```

## Document Processing

### PDF Not Processing

**Symptom:** "Failed to process PDF"

**Causes:**
1. Encrypted/password-protected PDF
2. Scanned PDF (image-only, no text layer)
3. Corrupted file

**Solution:**
- Use a PDF with embedded text
- For scanned PDFs, use OCR tools first

---

### No Results Found

**Symptom:** Query returns empty results

**Causes:**
1. No documents ingested
2. Query unrelated to document content
3. Embedding model issue

**Solution:**
1. Verify documents are ingested (check admin panel)
2. Try more specific queries
3. Re-ingest documents

## Reset Everything

To completely reset the application:

```bash
# Delete all data
rm -rf backend/data/

# Restart the application
python run.py
```

This will require re-uploading all documents and re-creating the admin account.
