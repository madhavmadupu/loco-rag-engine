# API Reference

Complete documentation for all LOCO RAG Engine API endpoints.

## Base URL

```
http://localhost:8000
```

---

## Health Check

### `GET /health`

Check if the backend is running.

**Response**
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

---

## Document Ingestion

### `POST /ingest`

Upload and process a document.

**Request**
- Content-Type: `multipart/form-data`
- Body: `file` (PDF or text file)

**Response**
```json
{
  "success": true,
  "filename": "document.pdf",
  "chunks_processed": 15,
  "message": "Document ingested successfully"
}
```

**Errors**
| Code | Description |
|------|-------------|
| 400 | Invalid file type |
| 500 | Processing error |

---

## Query

### `POST /query`

Ask a question about your documents.

**Request**
```json
{
  "query": "What is the main topic of the document?",
  "top_k": 3
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `query` | string | Yes | - | The question to ask |
| `top_k` | integer | No | 3 | Number of sources to retrieve |

**Response**
```json
{
  "answer": "The main topic is...",
  "references": [
    {
      "source": "document.pdf",
      "snippet": "Relevant text excerpt...",
      "score": 0.89
    }
  ]
}
```

---

## Authentication

### `POST /admin/setup`

Create the initial admin password (first run only).

**Request**
```json
{
  "password": "your-secure-password"
}
```

**Response**
```json
{
  "success": true,
  "message": "Admin account created"
}
```

**Errors**
| Code | Description |
|------|-------------|
| 400 | Admin already exists |

---

### `POST /admin/login`

Authenticate and receive a JWT token.

**Request**
```json
{
  "password": "your-password"
}
```

**Response**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

**Errors**
| Code | Description |
|------|-------------|
| 401 | Invalid password |

---

## Configuration

### `GET /admin/config`

Get current engine settings.

**Headers**
```
Authorization: Bearer <token>
```

**Response**
```json
{
  "model": "llama3.2",
  "temperature": 0.7,
  "top_k": 3
}
```

---

### `POST /admin/config`

Update engine settings.

**Headers**
```
Authorization: Bearer <token>
```

**Request**
```json
{
  "temperature": 0.8,
  "top_k": 5
}
```

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `model` | string | - | Ollama model name |
| `temperature` | float | 0.0-2.0 | Response creativity |
| `top_k` | integer | 1-10 | Sources per query |

**Response**
```json
{
  "success": true,
  "message": "Configuration updated"
}
```
