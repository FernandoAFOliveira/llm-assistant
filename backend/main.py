from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from llama_index.core import VectorStoreIndex, StorageContext, Settings
from llama_index.core import SimpleDirectoryReader
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.ollama import OllamaEmbedding
import chromadb
import sqlite3
import os
import subprocess

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"])

# Configure LlamaIndex to use Ollama
llm = Ollama(
    model="llama3",
    base_url="http://host.docker.internal:11434",  # Connect to host's Ollama
    request_timeout=60.0  # Add timeout for safety
)
embed_model = OllamaEmbedding(
    model_name="llama3",
    base_url="http://host.docker.internal:11434"
)

Settings.llm = llm
Settings.embed_model = embed_model

# Initialize ChromaDB
CHROMA_PATH = "./chroma_storage"
chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
collection = chroma_client.get_or_create_collection("llm_assistant")
vector_store = ChromaVectorStore(chroma_collection=collection)
storage_context = StorageContext.from_defaults(vector_store=vector_store)

# Initialize SQLite for file tracking
DATABASE_PATH = "/data/project.db"  # Changed from "project.db"
conn = sqlite3.connect(DATABASE_PATH)
conn.execute("""
    CREATE TABLE IF NOT EXISTS files (
        path TEXT PRIMARY KEY,
        last_updated TIMESTAMP,
        language TEXT
    )
""")
conn.close()

@app.post("/index_project")
def index_project(project_path: str):
    # Index files into ChromaDB
    documents = SimpleDirectoryReader(project_path).load_data()
    index = VectorStoreIndex.from_documents(documents, storage_context=storage_context)
    return {"status": f"Project indexed! {len(documents)} files processed."}

@app.post("/ask")
async def ask(question: str):
    # Retrieve context from ChromaDB
    index = VectorStoreIndex.from_vector_store(vector_store)
    query_engine = index.as_query_engine()
    response = await query_engine.aquery(question)  # Use async query
    return {"response": str(response)}

@app.get("/")
async def root():
    return {"message": "API is running"}

@app.post("/api/start-services")
async def start_services():
    try:
        process = subprocess.Popen(
            ["./launch.sh"],
            cwd="/app",  # Make sure this matches your Docker WORKDIR
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        return {"success": True, "message": "Services starting"}
    except Exception as e:
        return {"success": False, "error": str(e)}
    