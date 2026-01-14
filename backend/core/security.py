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

"""Security utilities for authentication and authorization.

This module provides password hashing, JWT token management, and
authentication helpers for the admin panel.

All authentication is local - no external services are used.

Typical usage example:

    # Create admin account
    hashed = hash_password("mysecretpassword")
    set_admin_password_hash(hashed)
    
    # Authenticate and get token
    if verify_password("mysecretpassword", hashed):
        token = create_access_token(data={"sub": "admin"})
"""

import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from backend.core.database import (
    admin_exists,
    get_admin_password_hash,
    set_admin_password_hash,
)

# JWT Configuration
# In production, use environment variable for SECRET_KEY
SECRET_KEY = os.getenv("LOCO_SECRET_KEY", "loco-rag-engine-local-secret-key-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Password hashing context
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Bearer token security scheme
_bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hash a password using bcrypt.
    
    Args:
        password: The plain-text password to hash.
        
    Returns:
        The bcrypt hash of the password.
        
    Example:
        hashed = hash_password("mysecretpassword")
    """
    return _pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash.
    
    Args:
        plain_password: The plain-text password to verify.
        hashed_password: The bcrypt hash to check against.
        
    Returns:
        True if the password matches, False otherwise.
        
    Example:
        if verify_password(user_input, stored_hash):
            print("Password correct")
    """
    return _pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a JWT access token.
    
    Args:
        data: Dictionary of claims to include in the token.
        expires_delta: Optional custom expiration time. Defaults to
            ACCESS_TOKEN_EXPIRE_MINUTES.
            
    Returns:
        The encoded JWT token string.
        
    Example:
        token = create_access_token({"sub": "admin"})
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """Verify a JWT token and return its claims.
    
    Args:
        token: The JWT token string to verify.
        
    Returns:
        The token's claims dictionary if valid, None otherwise.
        
    Example:
        claims = verify_token(token)
        if claims:
            print(f"Token valid for: {claims.get('sub')}")
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def setup_admin(password: str) -> bool:
    """Create the initial admin account.
    
    This should only be called once during first-time setup.
    
    Args:
        password: The admin password to set.
        
    Returns:
        True if the admin was created successfully.
        
    Raises:
        ValueError: If an admin account already exists.
        
    Example:
        if not admin_exists():
            setup_admin("mysecretpassword")
    """
    if admin_exists():
        raise ValueError("Admin account already exists")
    
    hashed = hash_password(password)
    set_admin_password_hash(hashed)
    return True


def authenticate_admin(password: str) -> Optional[str]:
    """Authenticate the admin and return an access token.
    
    Args:
        password: The admin password to verify.
        
    Returns:
        A JWT access token if authentication succeeds, None otherwise.
        
    Example:
        token = authenticate_admin(user_password)
        if token:
            print("Login successful")
        else:
            print("Invalid password")
    """
    stored_hash = get_admin_password_hash()
    
    if not stored_hash:
        return None
    
    if not verify_password(password, stored_hash):
        return None
    
    return create_access_token(data={"sub": "admin"})


async def get_current_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> str:
    """FastAPI dependency to verify admin authentication.
    
    Use this as a dependency in protected endpoints to require admin
    authentication.
    
    Args:
        credentials: The Bearer token from the Authorization header.
        
    Returns:
        The admin subject string if authenticated.
        
    Raises:
        HTTPException: If authentication fails (401 Unauthorized).
        
    Example:
        @app.get("/admin/config")
        async def get_config(admin: str = Depends(get_current_admin)):
            return {"admin": admin, "config": load_config()}
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if credentials is None:
        raise credentials_exception
    
    token = credentials.credentials
    payload = verify_token(token)
    
    if payload is None:
        raise credentials_exception
    
    subject = payload.get("sub")
    if subject != "admin":
        raise credentials_exception
    
    return subject
