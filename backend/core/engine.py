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

"""LOCO RAG Engine - Core retrieval and generation logic.

This module implements the main RAG (Retrieval-Augmented Generation) engine
that handles document ingestion, vector embeddings, semantic search, and
LLM-powered answer generation with source citations.

Typical usage example:

    engine = LocoEngine()
    
    # Ingest documents
    chunks = ["First chunk of text", "Second chunk of text"]
    metadata = {"filename": "document.pdf", "page": 1}
    engine.ingest(chunks, metadata)
    
    # Query the knowledge base
    result = engine.query("What is this document about?")
    print(result["answer"])
    print(result["references"])
"""

from typing import Any, Optional

import ollama

from backend.core.database import get_lancedb_connection, load_config


class LocoEngine:
    """RAG engine for document ingestion and query processing.
    
    This class manages the vector database, generates embeddings using Ollama,
    and orchestrates the retrieval and generation pipeline.
    
    Attributes:
        db: LanceDB database connection.
        table_name: Name of the table storing document vectors.
        config: Application configuration dictionary.
        
    Example:
        engine = LocoEngine()
        engine.ingest(["Hello world"], {"filename": "test.txt"})
        result = engine.query("What is the greeting?")
    """
    
    TABLE_NAME = "doc_store"
    
    def __init__(self) -> None:
        """Initialize the LOCO RAG engine.
        
        Sets up the database connection, loads application configuration,
        and initializes the Ollama client with explicit localhost to avoid
        0.0.0.0 binding issues.
        """
        self.db = get_lancedb_connection()
        self.config = load_config()
        # Explicitly use 127.0.0.1 to avoid issues with OLLAMA_HOST=0.0.0.0
        self.client = ollama.Client(host='http://127.0.0.1:11434')
    
    def get_embedding(self, text: str) -> list[float]:
        """Generate a vector embedding for the given text.
        
        Uses the Ollama embedding model specified in the configuration to
        convert text into a high-dimensional vector representation.
        
        Args:
            text: The input text to embed.
            
        Returns:
            A list of floats representing the embedding vector.
            
        Raises:
            ollama.ResponseError: If the Ollama API request fails.
            
        Example:
            embedding = engine.get_embedding("Hello, world!")
            print(f"Embedding dimension: {len(embedding)}")
        """
        model = self.config.get("embedding_model", "nomic-embed-text")
        response = self.client.embeddings(model=model, prompt=text)
        return response["embedding"]
    
    def ingest(
        self,
        chunks: list[str],
        metadata: dict[str, Any],
    ) -> int:
        """Ingest document chunks into the vector database.
        
        Generates embeddings for each chunk and stores them in LanceDB along
        with the original text and metadata for later retrieval.
        
        Args:
            chunks: List of text chunks to ingest.
            metadata: Dictionary containing document metadata. Must include
                'filename' key. May optionally include 'page' for PDF pages.
                
        Returns:
            The number of chunks successfully ingested.
            
        Raises:
            ValueError: If chunks list is empty or metadata is missing filename.
            ollama.ResponseError: If embedding generation fails.
            
        Example:
            chunks = ["Chunk 1 text", "Chunk 2 text"]
            metadata = {"filename": "document.pdf", "page": 1}
            count = engine.ingest(chunks, metadata)
            print(f"Ingested {count} chunks")
        """
        if not chunks:
            raise ValueError("Cannot ingest empty chunks list")
        
        if "filename" not in metadata:
            raise ValueError("Metadata must include 'filename' key")
        
        # Build data records with embeddings
        data = []
        for i, chunk in enumerate(chunks):
            embedding = self.get_embedding(chunk)
            data.append({
                "vector": embedding,
                "text": chunk,
                "source": metadata["filename"],
                "page": metadata.get("page", i),
            })
        
        # Create or append to table
        if self.TABLE_NAME not in self.db.table_names():
            self.db.create_table(self.TABLE_NAME, data=data)
        else:
            table = self.db.open_table(self.TABLE_NAME)
            table.add(data)
        
        return len(data)
    
    def query(
        self,
        user_input: str,
        top_k: Optional[int] = None,
    ) -> dict[str, Any]:
        """Query the knowledge base and generate an answer.
        
        Performs vector similarity search to find relevant document chunks,
        constructs a context-augmented prompt, and generates an answer using
        the configured LLM.
        
        Args:
            user_input: The user's question or query.
            top_k: Number of relevant chunks to retrieve. Defaults to the
                value in configuration (default: 3).
                
        Returns:
            A dictionary containing:
                - answer: The generated response text.
                - references: List of source reference dictionaries, each
                    containing 'source', 'snippet', and 'score'.
                    
        Raises:
            ValueError: If the document store is empty.
            ollama.ResponseError: If the LLM request fails.
            
        Example:
            result = engine.query("What is the main topic?")
            print(result["answer"])
            for ref in result["references"]:
                print(f"Source: {ref['source']}")
        """
        if self.TABLE_NAME not in self.db.table_names():
            raise ValueError(
                "No documents in the knowledge base. Please ingest documents first."
            )
        
        # Use configured or provided top_k
        if top_k is None:
            top_k = self.config.get("top_k", 3)
        
        # Generate query embedding and search
        table = self.db.open_table(self.TABLE_NAME)
        query_embedding = self.get_embedding(user_input)
        
        results = table.search(query_embedding).limit(top_k).to_list()
        
        # Build context from retrieved chunks
        context = "\n---\n".join([r["text"] for r in results])
        
        # Construct augmented prompt
        prompt = f"""Use the provided context to answer the question. 
If the answer is not in the context, say you don't know.
Provide citations like [Source: filename].

Context:
{context}

Question: {user_input}

Answer:"""
        
        # Generate response using LLM
        model = self.config.get("model", "llama3.2")
        temperature = self.config.get("temperature", 0.7)
        
        response = self.client.generate(
            model=model,
            prompt=prompt,
            options={"temperature": temperature},
            stream=False,
        )
        
        # Build references list
        references = [
            {
                "source": r["source"],
                "snippet": r["text"][:150] + "..." if len(r["text"]) > 150 else r["text"],
                "score": float(r.get("_distance", 0)),
            }
            for r in results
        ]
        
        return {
            "answer": response["response"],
            "references": references,
        }
    
    def get_document_count(self) -> int:
        """Get the total number of document chunks in the database.
        
        Returns:
            The count of stored document chunks, or 0 if no documents exist.
            
        Example:
            count = engine.get_document_count()
            print(f"Knowledge base contains {count} chunks")
        """
        if self.TABLE_NAME not in self.db.table_names():
            return 0
        
        table = self.db.open_table(self.TABLE_NAME)
        return table.count_rows()
