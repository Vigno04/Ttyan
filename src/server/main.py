from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import json
from pathlib import Path

app = FastAPI()

# Enable CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STORAGE_DIR = Path("storage")
STORAGE_DIR.mkdir(exist_ok=True)

@app.get("/api/storage/{username}/{plugin_id}")
async def get_storage(username: str, plugin_id: str):
    user_dir = STORAGE_DIR / username
    file_path = user_dir / f"{plugin_id}.json"
    
    if not file_path.exists():
        return {}
    
    try:
        with open(file_path, "r") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading storage: {str(e)}")

@app.post("/api/storage/{username}/{plugin_id}")
async def save_storage(username: str, plugin_id: str, data: dict = Body(...)):
    user_dir = STORAGE_DIR / username
    user_dir.mkdir(exist_ok=True)
    file_path = user_dir / f"{plugin_id}.json"
    
    try:
        with open(file_path, "w") as f:
            json.dump(data, f)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error writing storage: {str(e)}")

# Serve static files from the 'dist' directory
# This must be at the end so it doesn't shadow API routes
if os.path.exists("dist"):
    app.mount("/", StaticFiles(directory="dist", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
