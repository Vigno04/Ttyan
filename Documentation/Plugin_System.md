# Plugin System & Catalogue

## Overview
The TTYAN Plugin System is designed to be highly modular, mimicking systems like Jellyfin or standard package managers. The "Catalogue" (or Plugin Store) is the central interface for managing this ecosystem.

## Repositories
- Plugins are distributed via **Repositories**.
- A repository is simply a JSON manifest accessible via a URL (e.g., `https://example.com/ttyan-repo.json`).
- A single repository can host multiple plugins.
- Users can add or remove repositories directly from the Catalogue.

## Plugin Distribution Methods
1. **Remote Repository:** Pulled from an HTTP/S endpoint. The frontend fetches the manifest, displays available plugins, and allows 1-click installation.
2. **Local ZIP Archive:** Users can manually import a plugin packaged as a `.zip` file. TTYAN extracts, validates the `manifest.json`, and installs it directly into the `/data/plugins` volume.

## Versioning & Updates
- Every plugin `manifest.json` must include a `version` string (Semantic Versioning recommended, e.g., `1.0.2`).
- The Catalogue compares the installed plugin version with the newest version available in the active repositories.
- If a newer version is found, an "Update" button becomes available, allowing an in-place upgrade.

## Plugin Manifest Schema (`manifest.json`)
```json
{
  "id": "com.developer.myplugin",
  "name": "My Plugin",
  "version": "1.2.0",
  "description": "A very useful micro-utility.",
  "author": "DeveloperName",
  "path": "Utilities/Text",
  "entrypoint": "server.js",
  "permissions": ["net", "read", "write"],
  "modules": []
}
```
