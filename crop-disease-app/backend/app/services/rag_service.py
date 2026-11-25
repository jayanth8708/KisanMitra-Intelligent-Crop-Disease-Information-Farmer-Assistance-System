"""
RAG Service — ChromaDB + Cohere Embeddings + LangChain retrieval.
Ingests agricultural PDFs and plain-text documents.
"""
import os
import json
from pathlib import Path
from typing import List, Optional, Tuple

import chromadb
from chromadb.config import Settings as ChromaSettings
import cohere

from app.core.config import settings

DOCUMENTS_DIR = Path("./data/documents")
COLLECTION_NAME = "agricultural_knowledge"


class RAGService:
    def __init__(self):
        self.co = None
        self.chroma_client = None
        self.collection = None
        self._initialized = False

    def _get_cohere(self):
        if not self.co:
            self.co = cohere.Client(settings.COHERE_API_KEY)
        return self.co

    def _get_chroma(self):
        if not self.chroma_client:
            self.chroma_client = chromadb.PersistentClient(
                path=settings.CHROMA_DB_PATH,
                settings=ChromaSettings(anonymized_telemetry=False),
            )
        return self.chroma_client

    async def initialize(self):
        """Set up ChromaDB collection and ingest any new documents."""
        client = self._get_chroma()
        self.collection = client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
        self._initialized = True
        # Ingest documents if the collection is empty
        if self.collection.count() == 0:
            await self._ingest_documents()

    async def _ingest_documents(self):
        """Read all text/pdf documents from the data/documents folder and embed them."""
        docs_path = DOCUMENTS_DIR
        docs_path.mkdir(parents=True, exist_ok=True)

        texts, metadatas, ids = [], [], []
        doc_id = 0

        for filepath in docs_path.rglob("*"):
            if filepath.suffix.lower() == ".txt":
                content = filepath.read_text(encoding="utf-8", errors="ignore")
                chunks = self._chunk_text(content, source=str(filepath))
                for chunk in chunks:
                    texts.append(chunk["text"])
                    metadatas.append({"source": filepath.name, "type": "txt"})
                    ids.append(f"doc_{doc_id}")
                    doc_id += 1

            elif filepath.suffix.lower() == ".pdf":
                try:
                    from pypdf import PdfReader
                    reader = PdfReader(str(filepath))
                    full_text = "\n".join(page.extract_text() or "" for page in reader.pages)
                    chunks = self._chunk_text(full_text, source=str(filepath))
                    for chunk in chunks:
                        texts.append(chunk["text"])
                        metadatas.append({"source": filepath.name, "type": "pdf"})
                        ids.append(f"doc_{doc_id}")
                        doc_id += 1
                except Exception as e:
                    print(f"[RAG] Could not read PDF {filepath}: {e}")

        if texts:
            await self._embed_and_store(texts, metadatas, ids)
            print(f"[RAG] Ingested {len(texts)} chunks from {docs_path}")

    def _chunk_text(self, text: str, source: str, chunk_size: int = 800, overlap: int = 100) -> List[dict]:
        """Split text into overlapping chunks."""
        words = text.split()
        chunks = []
        i = 0
        while i < len(words):
            chunk_words = words[i: i + chunk_size]
            chunks.append({"text": " ".join(chunk_words), "source": source})
            i += chunk_size - overlap
        return chunks

    async def _embed_and_store(self, texts: List[str], metadatas: List[dict], ids: List[str]):
        """Embed texts using Cohere and store in ChromaDB."""
        co = self._get_cohere()
        batch_size = 96  # Cohere limit
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i: i + batch_size]
            batch_meta = metadatas[i: i + batch_size]
            batch_ids = ids[i: i + batch_size]

            response = co.embed(
                texts=batch_texts,
                model="embed-english-v3.0",
                input_type="search_document",
            )
            embeddings = response.embeddings
            self.collection.add(
                embeddings=embeddings,
                documents=batch_texts,
                metadatas=batch_meta,
                ids=batch_ids,
            )

    async def retrieve(self, query: str, language: str = "en", n_results: int = 5) -> Tuple[List[str], List[dict]]:
        """Retrieve relevant document chunks for a query."""
        if not self._initialized:
            await self.initialize()

        if self.collection.count() == 0:
            return [], []

        try:
            co = self._get_cohere()
            response = co.embed(
                texts=[query],
                model="embed-english-v3.0",
                input_type="search_query",
            )
            query_embedding = response.embeddings[0]

            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=min(n_results, self.collection.count()),
                include=["documents", "metadatas", "distances"],
            )

            docs = results["documents"][0] if results["documents"] else []
            metas = results["metadatas"][0] if results["metadatas"] else []
            return docs, metas
        except Exception as e:
            print(f"[RAG] Retrieval error: {e}")
            return [], []

    async def add_document_text(self, text: str, source_name: str, doc_type: str = "manual"):
        """Add a single document text at runtime."""
        if not self._initialized:
            await self.initialize()

        chunks = self._chunk_text(text, source=source_name)
        if not chunks:
            return

        existing_count = self.collection.count()
        texts = [c["text"] for c in chunks]
        metadatas = [{"source": source_name, "type": doc_type}] * len(chunks)
        ids = [f"rt_{existing_count + i}" for i in range(len(chunks))]

        await self._embed_and_store(texts, metadatas, ids)
        print(f"[RAG] Added {len(chunks)} chunks from '{source_name}'")


rag_service = RAGService()
