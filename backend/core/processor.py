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

"""Document processing and semantic chunking utilities.

This module provides functions for extracting text from documents and
splitting it into semantically coherent chunks using embedding-based
similarity detection.

Semantic chunking is a 2025 best practice that creates chunks based on
topic boundaries rather than arbitrary character counts, resulting in
more coherent context for RAG queries.

Typical usage example:

    from backend.core.processor import extract_text_from_pdf, semantic_chunking
    
    # Extract text from PDF
    pages = extract_text_from_pdf(pdf_bytes)
    
    # Chunk semantically
    chunks = semantic_chunking(full_text, get_embedding_fn)
"""

from io import BytesIO
from typing import Callable

import numpy as np
from pypdf import PdfReader
from sklearn.metrics.pairwise import cosine_similarity


def extract_text_from_pdf(file_bytes: bytes) -> list[dict[str, any]]:
    """Extract text from a PDF file.
    
    Reads the PDF and extracts text from each page, returning a list of
    page dictionaries with text content and page numbers.
    
    Args:
        file_bytes: Raw bytes of the PDF file.
        
    Returns:
        A list of dictionaries, each containing:
            - text: The extracted text content.
            - page: The 1-indexed page number.
            
    Raises:
        ValueError: If the file is not a valid PDF.
        
    Example:
        with open("document.pdf", "rb") as f:
            pages = extract_text_from_pdf(f.read())
        for page in pages:
            print(f"Page {page['page']}: {len(page['text'])} chars")
    """
    try:
        reader = PdfReader(BytesIO(file_bytes))
    except Exception as e:
        raise ValueError(f"Failed to read PDF: {e}") from e
    
    pages = []
    for i, page in enumerate(reader.pages, start=1):
        text = page.extract_text()
        if text and text.strip():
            pages.append({
                "text": text.strip(),
                "page": i,
            })
    
    return pages


def semantic_chunking(
    text: str,
    get_embedding_fn: Callable[[str], list[float]],
    threshold: float = 0.7,
    min_chunk_size: int = 100,
) -> list[str]:
    """Split text into semantically coherent chunks.
    
    Uses embedding-based similarity to detect topic boundaries in the text.
    Consecutive sentences with high similarity are grouped together, while
    a drop in similarity indicates a new topic and chunk boundary.
    
    This approach creates more meaningful chunks than arbitrary character
    or token-based splitting, leading to better RAG retrieval quality.
    
    Args:
        text: The input text to chunk.
        get_embedding_fn: A function that takes a string and returns an
            embedding vector as a list of floats.
        threshold: Cosine similarity threshold below which a new chunk
            starts. Lower values create larger chunks. Defaults to 0.7.
        min_chunk_size: Minimum number of characters per chunk. Sentences
            will be combined until this threshold is met. Defaults to 100.
            
    Returns:
        A list of text chunks, each representing a semantically coherent
        topic or section.
        
    Raises:
        ValueError: If text is empty.
        
    Example:
        def get_embedding(text):
            return ollama.embeddings(model="nomic-embed-text", prompt=text)
        
        chunks = semantic_chunking(document_text, get_embedding)
        print(f"Created {len(chunks)} semantic chunks")
    """
    if not text or not text.strip():
        raise ValueError("Cannot chunk empty text")
    
    # Split into sentences (simple approach using period + space)
    # A more robust approach would use nltk or spacy
    sentences = [s.strip() for s in text.split(". ") if s.strip()]
    
    if len(sentences) <= 1:
        return [text]
    
    # Generate embeddings for all sentences
    embeddings = [get_embedding_fn(s) for s in sentences]
    
    # Build chunks based on semantic similarity
    chunks = []
    current_chunk = [sentences[0]]
    current_size = len(sentences[0])
    
    for i in range(1, len(sentences)):
        # Calculate similarity between consecutive sentences
        similarity = cosine_similarity(
            [embeddings[i - 1]], 
            [embeddings[i]]
        )[0][0]
        
        # Check if we should start a new chunk
        if similarity < threshold and current_size >= min_chunk_size:
            # Topic shift detected - finalize current chunk
            chunks.append(". ".join(current_chunk) + ".")
            current_chunk = [sentences[i]]
            current_size = len(sentences[i])
        else:
            # Continue current chunk
            current_chunk.append(sentences[i])
            current_size += len(sentences[i])
    
    # Add final chunk
    if current_chunk:
        final_text = ". ".join(current_chunk)
        if not final_text.endswith("."):
            final_text += "."
        chunks.append(final_text)
    
    return chunks


def simple_chunking(
    text: str,
    chunk_size: int = 1000,
    overlap: int = 100,
) -> list[str]:
    """Split text into fixed-size chunks with overlap.
    
    A simpler chunking approach that splits text at character boundaries.
    Provides overlap between chunks to maintain context across boundaries.
    
    This is faster than semantic chunking but may split mid-thought.
    Use semantic_chunking for higher quality results.
    
    Args:
        text: The input text to chunk.
        chunk_size: Maximum characters per chunk. Defaults to 1000.
        overlap: Number of overlapping characters between chunks.
            Defaults to 100.
            
    Returns:
        A list of text chunks.
        
    Example:
        chunks = simple_chunking(long_document, chunk_size=500)
    """
    if not text:
        return []
    
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        
        # Try to break at a sentence boundary
        if end < len(text):
            last_period = chunk.rfind(". ")
            if last_period > chunk_size // 2:
                end = start + last_period + 2
                chunk = text[start:end]
        
        chunks.append(chunk.strip())
        start = end - overlap
    
    return chunks
