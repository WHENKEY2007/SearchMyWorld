import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database.connection import init_db
from app.routers import folders, index, search, files, timeline, stats, projects, reconstruction

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("SearchMyWorld")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database schema and pragmas
    logger.info("Initializing SearchMyWorld SQLite database...")
    init_db()
    logger.info(f"Database ready at: {settings.DB_PATH}")
    yield
    logger.info("Shutting down SearchMyWorld backend.")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Local-First AI-Powered Personal Digital Memory & Retrieval System",
    lifespan=lifespan
)

# CORS configuration for desktop & web UI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(folders.router, prefix=settings.API_PREFIX)
app.include_router(index.router, prefix=settings.API_PREFIX)
app.include_router(search.router, prefix=settings.API_PREFIX)
app.include_router(files.router, prefix=settings.API_PREFIX)
app.include_router(timeline.router, prefix=settings.API_PREFIX)
app.include_router(stats.router, prefix=settings.API_PREFIX)
app.include_router(projects.router, prefix=settings.API_PREFIX)
app.include_router(reconstruction.router, prefix=settings.API_PREFIX)

@app.get(f"{settings.API_PREFIX}/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.VERSION
    }

# Mount Production Frontend with Single-Page Application (SPA) Routing Fallback
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
index_html = frontend_dist / "index.html"

if frontend_dist.exists() and index_html.exists():
    # Mount static assets directory
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    # Catch-all route for SPA client-side routing (e.g. /assistant, /search, /settings, /files)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # If the requested path is an actual file (e.g. favicon, logo), serve it
        file_path = frontend_dist / full_path
        if full_path and file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        # Otherwise, serve index.html so React Router renders the page
        return FileResponse(index_html)
else:
    @app.get("/")
    def root():
        return {
            "app": settings.APP_NAME,
            "version": settings.VERSION,
            "status": "online",
            "database": str(settings.DB_PATH)
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
