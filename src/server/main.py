from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import json
import httpx
import shutil
from pathlib import Path
from typing import List, Optional

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

PLUGINS_DIR = STORAGE_DIR / "plugins"
PLUGINS_DIR.mkdir(exist_ok=True)

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

# --- Plugin Management ---

@app.get("/api/plugins")
async def list_plugins():
    plugins = []
    if not PLUGINS_DIR.exists():
        return []
    
    for plugin_dir in PLUGINS_DIR.iterdir():
        if plugin_dir.is_dir():
            manifest_path = plugin_dir / "manifest.json"
            if manifest_path.exists():
                try:
                    with open(manifest_path, "r") as f:
                        manifest = json.load(f)
                        # Inject local basePath
                        manifest["basePath"] = f"/plugins/{plugin_dir.name}"
                        # Ensure image points to local if it was relative
                        if manifest.get("image") and not manifest["image"].startswith("http"):
                             manifest["image"] = f"/plugins/{plugin_dir.name}/{manifest['image']}"
                        plugins.append(manifest)
                except:
                    pass
    return plugins

@app.post("/api/plugins/install")
async def install_plugin(data: dict = Body(...)):
    plugin_id = data.get("id")
    base_url = data.get("basePath") # The remote URL to download from
    
    if not plugin_id or not base_url:
        raise HTTPException(status_code=400, detail="Missing id or basePath")

    # Helper to convert GitHub URLs to raw if needed
    def to_raw(url):
        if "github.com" in url and "raw.githubusercontent.com" not in url:
            match = url.split("github.com/")[1].split("/")
            if len(match) >= 4 and match[2] in ["blob", "tree"]:
                user, repo, _, branch = match[:4]
                path = "/".join(match[4:])
                return f"https://raw.githubusercontent.com/{user}/{repo}/{branch}/{path}"
        return url

    base_url = to_raw(base_url).rstrip('/')
    target_dir = PLUGINS_DIR / plugin_id
    target_dir.mkdir(exist_ok=True)

    async with httpx.AsyncClient(follow_redirects=True) as client:
        # 1. Download manifest.json
        try:
            res = await client.get(f"{base_url}/manifest.json")
            res.raise_for_status()
            manifest = res.json()
            with open(target_dir / "manifest.json", "w") as f:
                json.dump(manifest, f)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to download manifest: {str(e)}")

        # Files to download: ui.json and entrypoint
        files_to_download = ["ui.json", manifest.get("entrypoint")]
        if manifest.get("image") and not manifest["image"].startswith("http"):
            files_to_download.append(manifest["image"])

        for file_rel_path in files_to_download:
            if not file_rel_path: continue
            
            try:
                file_url = f"{base_url}/{file_rel_path}"
                file_res = await client.get(file_url)
                if file_res.status_code == 200:
                    local_path = target_dir / file_rel_path
                    local_path.parent.mkdir(parents=True, exist_ok=True)
                    with open(local_path, "wb") as f:
                        f.write(file_res.content)
            except Exception as e:
                print(f"Warning: Could not download {file_rel_path}: {e}")

    return {"status": "success", "plugin": manifest}

@app.delete("/api/plugins/{plugin_id}")
async def uninstall_plugin(plugin_id: str):
    target_dir = PLUGINS_DIR / plugin_id
    if target_dir.exists() and target_dir.is_dir():
        shutil.rmtree(target_dir)
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Plugin not found")

# Serve plugins as static files from the persistent storage
app.mount("/plugins", StaticFiles(directory=str(PLUGINS_DIR)), name="plugins")

# Serve static files from the 'dist' directory
# This must be at the end so it doesn't shadow API routes
if os.path.exists("dist"):
    app.mount("/", StaticFiles(directory="dist", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
