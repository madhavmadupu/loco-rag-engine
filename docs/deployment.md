# Deployment Guide

Instructions for deploying LOCO RAG Engine in production environments.

## Local Deployment

### Using run.py

The simplest way to run LOCO RAG Engine:

```bash
python run.py
```

This automatically:
1. Checks for Ollama installation
2. Pulls required models if missing
3. Starts backend on port 8000
4. Starts frontend on port 3000
5. Opens browser

## Production Build

### Frontend Build

```bash
cd frontend
npm run build
```

The built files will be in `frontend/.next/` (or `frontend/out/` for static export).

### Backend with Gunicorn

For production, use Gunicorn with Uvicorn workers:

```bash
pip install gunicorn

gunicorn backend.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
```

## Docker Deployment

### Dockerfile (Backend)

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### docker-compose.yml

```yaml
version: '3.8'
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend/data:/app/data
    depends_on:
      - ollama

  frontend:
    build:
      context: ./frontend
    ports:
      - "3000:3000"
    environment:
      - API_URL=http://backend:8000

  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama

volumes:
  ollama_data:
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8000 | Backend port |
| `OLLAMA_HOST` | localhost:11434 | Ollama API URL |
| `DATA_DIR` | backend/data | Data storage path |

## System Requirements

### Minimum
- 8 GB RAM
- 4 CPU cores
- 20 GB disk space

### Recommended
- 16 GB RAM
- 8 CPU cores
- 50 GB SSD

RAM usage depends on the Ollama model size. `llama3.2` requires ~4-8 GB.

## Security Considerations

1. **Network**: Keep Ollama port (11434) internal only
2. **Admin Password**: Use a strong password on first setup
3. **HTTPS**: Use a reverse proxy (nginx) for TLS termination
4. **Backups**: Regularly backup `backend/data/` directory
