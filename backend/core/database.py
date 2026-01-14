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

"""Database connection and configuration management for LOCO RAG Engine.

This module provides utilities for managing LanceDB vector database connections,
SQLite-based configuration storage, and admin credential management.

Typical usage example:

    db = get_lancedb_connection()
    config = load_config()
    config["temperature"] = 0.8
    save_config(config)
"""

import json
import os
import sqlite3
from pathlib import Path
from typing import Any, Optional

import lancedb

# Default paths for data storage
_DATA_DIR = Path(__file__).parent.parent / "data"
_VECTOR_DB_PATH = _DATA_DIR / "loco_vectors"
_SQLITE_DB_PATH = _DATA_DIR / "loco.db"
_CONFIG_PATH = _DATA_DIR / "config.json"

# Default configuration values
_DEFAULT_CONFIG = {
    "model": "llama3.2",
    "embedding_model": "nomic-embed-text",
    "temperature": 0.7,
    "top_k": 3,
}


def _ensure_data_dir() -> None:
    """Ensure the data directory exists.
    
    Creates the data directory if it doesn't exist. This is called
    automatically by functions that need to write to the data directory.
    """
    _DATA_DIR.mkdir(parents=True, exist_ok=True)


def get_lancedb_connection() -> lancedb.DBConnection:
    """Get a connection to the LanceDB vector database.
    
    Creates the data directory if it doesn't exist and returns a connection
    to the LanceDB database at the configured path.
    
    Returns:
        A LanceDB database connection object.
        
    Example:
        db = get_lancedb_connection()
        table = db.create_table("documents", data=[...])
    """
    _ensure_data_dir()
    return lancedb.connect(str(_VECTOR_DB_PATH))


def load_config() -> dict[str, Any]:
    """Load application configuration from disk.
    
    Reads the configuration from the JSON file. If the file doesn't exist,
    returns the default configuration.
    
    Returns:
        A dictionary containing the configuration values.
        
    Example:
        config = load_config()
        print(f"Using model: {config['model']}")
    """
    if _CONFIG_PATH.exists():
        with open(_CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return _DEFAULT_CONFIG.copy()


def save_config(config: dict[str, Any]) -> None:
    """Save application configuration to disk.
    
    Writes the configuration dictionary to a JSON file. Creates the data
    directory if it doesn't exist.
    
    Args:
        config: Dictionary containing configuration values to save.
        
    Example:
        config = load_config()
        config["temperature"] = 0.9
        save_config(config)
    """
    _ensure_data_dir()
    with open(_CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)


def get_sqlite_connection() -> sqlite3.Connection:
    """Get a connection to the SQLite database.
    
    Creates the data directory and database tables if they don't exist.
    The database is used for storing admin credentials.
    
    Returns:
        A SQLite database connection object.
        
    Example:
        conn = get_sqlite_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM admin")
    """
    _ensure_data_dir()
    conn = sqlite3.connect(str(_SQLITE_DB_PATH))
    conn.row_factory = sqlite3.Row
    
    # Create admin table if it doesn't exist
    conn.execute("""
        CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    
    return conn


def admin_exists() -> bool:
    """Check if an admin account has been created.
    
    Returns:
        True if an admin account exists, False otherwise.
        
    Example:
        if not admin_exists():
            print("Please create an admin account")
    """
    conn = get_sqlite_connection()
    cursor = conn.execute("SELECT COUNT(*) FROM admin")
    count = cursor.fetchone()[0]
    conn.close()
    return count > 0


def get_admin_password_hash() -> Optional[str]:
    """Get the admin password hash from the database.
    
    Returns:
        The bcrypt password hash string, or None if no admin exists.
        
    Example:
        hash = get_admin_password_hash()
        if hash and verify_password(password, hash):
            print("Login successful")
    """
    conn = get_sqlite_connection()
    cursor = conn.execute("SELECT password_hash FROM admin LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return row["password_hash"]
    return None


def set_admin_password_hash(password_hash: str) -> None:
    """Set the admin password hash in the database.
    
    Creates a new admin account with the given password hash. If an admin
    already exists, this will raise an error.
    
    Args:
        password_hash: The bcrypt password hash to store.
        
    Raises:
        ValueError: If an admin account already exists.
        
    Example:
        hash = hash_password("mysecurepassword")
        set_admin_password_hash(hash)
    """
    if admin_exists():
        raise ValueError("Admin account already exists")
    
    conn = get_sqlite_connection()
    conn.execute("INSERT INTO admin (password_hash) VALUES (?)", (password_hash,))
    conn.commit()
    conn.close()
