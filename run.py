#!/usr/bin/env python3
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

"""LOCO RAG Engine - One-Click Launcher.

This script provides a "batteries included" launch experience for the
LOCO RAG Engine. It:
  1. Checks for Ollama installation and required models
  2. Sets up Python virtual environment if needed
  3. Installs backend dependencies
  4. Starts the FastAPI backend server
  5. Starts the Next.js frontend (if available)
  6. Opens the browser to the application

Usage:
    python run.py
    
Options:
    --backend-only    Start only the backend server
    --skip-setup      Skip dependency installation
"""

import os
import platform
import subprocess
import sys
import time
import webbrowser
from pathlib import Path
from typing import Optional

# Configuration
BACKEND_PORT = 8000
FRONTEND_PORT = 3000
OLLAMA_MODELS = ["llama3.2", "nomic-embed-text"]


def print_banner() -> None:
    """Display the LOCO RAG Engine banner."""
    banner = """
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║     🚀 LOCO RAG Engine                                          ║
║     Local-Only Contextual Orchestration                         ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
    """
    print(banner)


def run_command(
    command: list[str],
    cwd: Optional[Path] = None,
    capture: bool = False,
) -> Optional[str]:
    """Run a shell command.
    
    Args:
        command: Command and arguments as a list.
        cwd: Working directory for the command.
        capture: If True, capture and return stdout.
        
    Returns:
        Command output if capture is True, None otherwise.
        
    Raises:
        subprocess.CalledProcessError: If the command fails.
    """
    if capture:
        result = subprocess.run(
            command,
            cwd=cwd,
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout
    else:
        subprocess.run(command, cwd=cwd, check=True)
        return None


def check_ollama() -> bool:
    """Check if Ollama is installed and running.
    
    Returns:
        True if Ollama is available, False otherwise.
    """
    print("🔍 Checking Ollama installation...")
    
    try:
        output = run_command(["ollama", "--version"], capture=True)
        print(f"   ✅ Ollama found: {output.strip()}")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("   ❌ Ollama not found!")
        print("\n   Please install Ollama from: https://ollama.com")
        print("   Then run: ollama serve")
        return False


def check_models() -> bool:
    """Check if required Ollama models are available.
    
    Returns:
        True if all models are available, False otherwise.
    """
    print("🔍 Checking required models...")
    
    try:
        output = run_command(["ollama", "list"], capture=True) or ""
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("   ❌ Could not list models. Is Ollama running?")
        return False
    
    missing_models = []
    for model in OLLAMA_MODELS:
        if model in output:
            print(f"   ✅ Model found: {model}")
        else:
            print(f"   ⚠️  Model missing: {model}")
            missing_models.append(model)
    
    if missing_models:
        print("\n📥 Pulling missing models...")
        for model in missing_models:
            print(f"   Pulling {model}... (this may take a few minutes)")
            try:
                run_command(["ollama", "pull", model])
                print(f"   ✅ {model} pulled successfully")
            except subprocess.CalledProcessError:
                print(f"   ❌ Failed to pull {model}")
                return False
    
    return True


def setup_backend(project_root: Path) -> bool:
    """Set up the Python backend environment.
    
    Args:
        project_root: Path to the project root directory.
        
    Returns:
        True if setup succeeded, False otherwise.
    """
    print("🐍 Setting up Python environment...")
    
    venv_path = project_root / "venv"
    requirements_path = project_root / "backend" / "requirements.txt"
    
    # Determine Python executable
    if platform.system() == "Windows":
        python_exe = venv_path / "Scripts" / "python.exe"
        pip_exe = venv_path / "Scripts" / "pip.exe"
    else:
        python_exe = venv_path / "bin" / "python"
        pip_exe = venv_path / "bin" / "pip"
    
    # Create virtual environment if it doesn't exist
    if not venv_path.exists():
        print("   Creating virtual environment...")
        try:
            run_command([sys.executable, "-m", "venv", str(venv_path)])
        except subprocess.CalledProcessError as e:
            print(f"   ❌ Failed to create venv: {e}")
            return False
    
    # Install/upgrade pip
    print("   Upgrading pip...")
    try:
        run_command([str(python_exe), "-m", "pip", "install", "--upgrade", "pip"])
    except subprocess.CalledProcessError:
        pass  # Continue even if pip upgrade fails
    
    # Install dependencies
    print("   Installing dependencies...")
    try:
        run_command([str(pip_exe), "install", "-r", str(requirements_path)])
        print("   ✅ Dependencies installed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"   ❌ Failed to install dependencies: {e}")
        return False


def start_backend(project_root: Path) -> subprocess.Popen:
    """Start the FastAPI backend server.
    
    Args:
        project_root: Path to the project root directory.
        
    Returns:
        The subprocess.Popen object for the backend process.
    """
    print(f"🚀 Starting backend on port {BACKEND_PORT}...")
    
    venv_path = project_root / "venv"
    
    if platform.system() == "Windows":
        python_exe = venv_path / "Scripts" / "python.exe"
    else:
        python_exe = venv_path / "bin" / "python"
    
    # Start uvicorn
    backend_proc = subprocess.Popen(
        [
            str(python_exe), "-m", "uvicorn",
            "backend.main:app",
            "--host", "0.0.0.0",
            "--port", str(BACKEND_PORT),
        ],
        cwd=project_root,
    )
    
    print(f"   ✅ Backend starting at http://localhost:{BACKEND_PORT}")
    return backend_proc


def start_frontend(project_root: Path) -> Optional[subprocess.Popen]:
    """Start the Next.js frontend development server.
    
    Args:
        project_root: Path to the project root directory.
        
    Returns:
        The subprocess.Popen object for the frontend process, or None.
    """
    frontend_path = project_root / "frontend"
    
    if not frontend_path.exists():
        print("⚠️  Frontend not found. Running backend only.")
        return None
    
    print(f"🎨 Starting frontend on port {FRONTEND_PORT}...")
    
    # Check if npm is available
    try:
        run_command(["npm", "--version"], capture=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("   ❌ npm not found. Please install Node.js.")
        return None
    
    # Install dependencies if needed
    node_modules = frontend_path / "node_modules"
    if not node_modules.exists():
        print("   Installing frontend dependencies...")
        try:
            run_command(["npm", "install"], cwd=frontend_path)
        except subprocess.CalledProcessError:
            print("   ❌ Failed to install frontend dependencies")
            return None
    
    # Start Next.js dev server
    frontend_proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=frontend_path,
        shell=True,
    )
    
    print(f"   ✅ Frontend starting at http://localhost:{FRONTEND_PORT}")
    return frontend_proc


def main() -> int:
    """Main entry point for the LOCO RAG Engine launcher.
    
    Returns:
        Exit code (0 for success, 1 for failure).
    """
    print_banner()
    
    # Determine project root
    project_root = Path(__file__).parent.resolve()
    os.chdir(project_root)
    
    # Parse arguments
    backend_only = "--backend-only" in sys.argv
    skip_setup = "--skip-setup" in sys.argv
    
    # Check prerequisites
    if not check_ollama():
        return 1
    
    if not check_models():
        return 1
    
    # Setup backend
    if not skip_setup:
        if not setup_backend(project_root):
            return 1
    
    # Start services
    backend_proc = start_backend(project_root)
    frontend_proc = None
    
    if not backend_only:
        frontend_proc = start_frontend(project_root)
    
    # Wait for backend to start
    print("\n⏳ Waiting for services to start...")
    time.sleep(3)
    
    # Open browser
    url = f"http://localhost:{FRONTEND_PORT if frontend_proc else BACKEND_PORT}"
    print(f"\n🌐 Opening browser to {url}")
    webbrowser.open(url)
    
    print("\n" + "=" * 60)
    print("✅ LOCO RAG Engine is running!")
    print("   Press Ctrl+C to stop all services")
    print("=" * 60 + "\n")
    
    # Wait for processes
    try:
        backend_proc.wait()
        if frontend_proc:
            frontend_proc.wait()
    except KeyboardInterrupt:
        print("\n\n🛑 Shutting down...")
        backend_proc.terminate()
        if frontend_proc:
            frontend_proc.terminate()
        print("   Goodbye! 👋")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
