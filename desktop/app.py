import sys
import os
import time
import subprocess
import threading
from pathlib import Path

# Paths
ROOT_DIR = Path(__file__).parent.parent.resolve()
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIST = ROOT_DIR / "frontend" / "dist"
PYTHON_EXE = BACKEND_DIR / ".venv" / "Scripts" / "python.exe"

# Ensure backend directory is in sys.path
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

def is_backend_alive() -> bool:
    import urllib.request
    try:
        with urllib.request.urlopen("http://127.0.0.1:8000/api/health", timeout=1.5) as response:
            return response.status == 200
    except Exception:
        return False

def start_backend():
    """Start local FastAPI backend if not already running."""
    if is_backend_alive():
        print("[Desktop Shell] Backend is already running.")
        return None

    print("[Desktop Shell] Starting local SearchMyWorld backend...")
    cmd = [str(PYTHON_EXE), "run.py"]
    proc = subprocess.Popen(
        cmd,
        cwd=str(BACKEND_DIR),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
    )

    # Wait until healthy
    for _ in range(15):
        if is_backend_alive():
            print("[Desktop Shell] Backend successfully connected.")
            return proc
        time.sleep(0.5)

    print("[Desktop Shell] Warning: Backend startup timeout.")
    return proc

def main():
    import webview

    backend_proc = start_backend()

    # Determine URL: By default, the backend now hosts the production frontend bundle at http://127.0.0.1:8000
    # If the Vite dev server is running on 5173, prefer that for hot-reloading
    url = "http://127.0.0.1:8000"
    import urllib.request
    try:
        with urllib.request.urlopen("http://localhost:5173", timeout=0.8) as res:
            if res.status == 200:
                url = "http://localhost:5173"
                print("[Desktop Shell] Connected to active Vite Dev Server.")
    except Exception:
        print("[Desktop Shell] Connected to unified local backend application.")

    print(f"[Desktop Shell] Launching native window targeting: {url}")

    # Create native Windows desktop window with Mindly Porcelain background
    window = webview.create_window(
        title="SearchMyWorld — Your AI Remembers",
        url=url,
        width=1280,
        height=820,
        min_size=(1024, 680),
        background_color='#FBFBFA',
        text_select=True,
    )

    try:
        webview.start(debug=False)
    finally:
        if backend_proc:
            print("[Desktop Shell] Terminating background backend...")
            backend_proc.terminate()

if __name__ == "__main__":
    main()
