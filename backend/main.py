# Copyright 2024 LOCO RAG Engine
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""LOCO RAG Engine - FastAPI Application.

This module defines the REST API endpoints for the LOCO RAG Engine,
including document ingestion, querying, and admin configuration.

To run the server:
    uvicorn backend.main:app --port 8000 --reload

Endpoints:
    GET  /health        - Health check
    POST /ingest        - Upload and process documents
    POST /query         - Ask questions about documents
    POST /admin/setup   - Create admin account (first run)
    POST /admin/login   - Authenticate and get JWT
    GET  /admin/config  - Get current settings
    POST /admin/config  - Update settings
"""

from typing import Any, Optional

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.core.database import admin_exists, load_config, save_config
from backend.core.engine import LocoEngine
from backend.core.processor import extract_text_from_pdf, semantic_chunking
from backend.core.security import (
    authenticate_admin,
    get_current_admin,
    setup_admin,
)

# Application version
__version__ = "1.0.0"

# Initialize FastAPI app
app = FastAPI(
    title="LOCO RAG Engine",
    description="Local-Only Contextual Orchestration - A private RAG system",
    version=__version__,
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the RAG engine
engine = LocoEngine()


# ============================================================================
# Request/Response Models
# ============================================================================


class QueryRequest(BaseModel):
    """Request model for the query endpoint."""
    
    query: str = Field(..., description="The question to ask")
    top_k: Optional[int] = Field(None, ge=1, le=10, description="Number of sources")


class QueryResponse(BaseModel):
    """Response model for the query endpoint."""
    
    answer: str
    references: list[dict[str, Any]]


class AdminSetupRequest(BaseModel):
    """Request model for admin account setup."""
    
    password: str = Field(..., min_length=8, description="Admin password")


class AdminLoginRequest(BaseModel):
    """Request model for admin login."""
    
    password: str


class LoginResponse(BaseModel):
    """Response model for login endpoint."""
    
    access_token: str
    token_type: str = "bearer"


class ConfigRequest(BaseModel):
    """Request model for configuration updates."""
    
    model: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    top_k: Optional[int] = Field(None, ge=1, le=10)


class HealthResponse(BaseModel):
    """Response model for health check."""
    
    status: str
    version: str
    documents: int
    admin_setup: bool


# ============================================================================
# Public Endpoints
# ============================================================================


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check() -> HealthResponse:
    """Check the health status of the API.
    
    Returns basic information about the server status, version,
    document count, and whether admin setup is complete.
    
    Returns:
        HealthResponse with status information.
    """
    return HealthResponse(
        status="healthy",
        version=__version__,
        documents=engine.get_document_count(),
        admin_setup=admin_exists(),
    )


@app.post("/ingest", tags=["Documents"])
async def ingest_document(file: UploadFile = File(...)) -> dict[str, Any]:
    """Upload and process a document.
    
    Accepts PDF or text files, extracts content, performs semantic
    chunking, generates embeddings, and stores in the vector database.
    
    Args:
        file: The uploaded file (PDF or text).
        
    Returns:
        Dictionary with success status and chunk count.
        
    Raises:
        HTTPException: 400 if file type is unsupported.
        HTTPException: 500 if processing fails.
    """
    filename = file.filename or "unknown"
    content = await file.read()
    
    # Determine file type and extract text
    if filename.lower().endswith(".pdf"):
        try:
            pages = extract_text_from_pdf(content)
            full_text = "\n\n".join([p["text"] for p in pages])
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    elif filename.lower().endswith(".txt"):
        try:
            full_text = content.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="Invalid text encoding")
    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload PDF or TXT files."
        )
    
    # Perform semantic chunking
    try:
        chunks = semantic_chunking(full_text, engine.get_embedding)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chunking failed: {e}")
    
    # Ingest into vector database
    try:
        metadata = {"filename": filename}
        count = engine.ingest(chunks, metadata)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {e}")
    
    return {
        "success": True,
        "filename": filename,
        "chunks_processed": count,
        "message": "Document ingested successfully",
    }


@app.post("/query", response_model=QueryResponse, tags=["Query"])
async def query_documents(request: QueryRequest) -> QueryResponse:
    """Ask a question about the ingested documents.
    
    Performs semantic search to find relevant document chunks,
    then uses the LLM to generate an answer with citations.
    
    Args:
        request: QueryRequest with the question and optional top_k.
        
    Returns:
        QueryResponse with the answer and source references.
        
    Raises:
        HTTPException: 400 if no documents are ingested.
        HTTPException: 500 if query processing fails.
    """
    try:
        result = engine.query(request.query, request.top_k)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {e}")
    
    return QueryResponse(
        answer=result["answer"],
        references=result["references"],
    )


# ============================================================================
# Admin Endpoints
# ============================================================================


@app.post("/admin/setup", tags=["Admin"])
async def admin_setup(request: AdminSetupRequest) -> dict[str, Any]:
    """Create the initial admin account.
    
    This endpoint can only be called once. Subsequent calls will fail.
    
    Args:
        request: AdminSetupRequest with the admin password.
        
    Returns:
        Success message.
        
    Raises:
        HTTPException: 400 if admin already exists.
    """
    try:
        setup_admin(request.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return {
        "success": True,
        "message": "Admin account created successfully",
    }


@app.post("/admin/login", response_model=LoginResponse, tags=["Admin"])
async def admin_login(request: AdminLoginRequest) -> LoginResponse:
    """Authenticate and receive an access token.
    
    Args:
        request: AdminLoginRequest with the admin password.
        
    Returns:
        LoginResponse with the JWT access token.
        
    Raises:
        HTTPException: 401 if authentication fails.
        HTTPException: 400 if no admin account exists.
    """
    if not admin_exists():
        raise HTTPException(
            status_code=400,
            detail="No admin account. Please run setup first."
        )
    
    token = authenticate_admin(request.password)
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password",
        )
    
    return LoginResponse(access_token=token)


@app.get("/admin/config", tags=["Admin"])
async def get_config(
    _: str = Depends(get_current_admin),
) -> dict[str, Any]:
    """Get current engine configuration.
    
    Requires admin authentication via Bearer token.
    
    Returns:
        Current configuration dictionary.
    """
    return load_config()


@app.post("/admin/config", tags=["Admin"])
async def update_config(
    request: ConfigRequest,
    _: str = Depends(get_current_admin),
) -> dict[str, Any]:
    """Update engine configuration.
    
    Requires admin authentication via Bearer token.
    Only provided fields will be updated.
    
    Args:
        request: ConfigRequest with fields to update.
        
    Returns:
        Updated configuration.
    """
    config = load_config()
    
    if request.model is not None:
        config["model"] = request.model
    if request.temperature is not None:
        config["temperature"] = request.temperature
    if request.top_k is not None:
        config["top_k"] = request.top_k
    
    save_config(config)
    
    # Reload engine config
    engine.config = load_config()
    
    return {
        "success": True,
        "message": "Configuration updated",
        "config": config,
    }
