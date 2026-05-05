# TTYAN - System Architecture

**TTYAN** is a self-hosted, extensible "Swiss Army knife" for micro-utilities. The project's goal is to provide a single, ultra-lightweight Docker container capable of running hundreds of different tools while maintaining a consistent UI and guaranteeing maximum security (isolation) when executing third-party code.

---

## 1. Three-Tier Architecture

The system is designed to separate responsibilities and ensure security without sacrificing power:

1. **The Core (Host):** The untouchable engine of the app. It manages the database, the user interface, network requests, and acts as the "customs officer" for permissions.
2. **Official Modules (On-Demand Batteries):** Static system binaries (e.g., FFmpeg, SQLite, AI tools) officially provided by TTYAN. They are downloaded into the container only when requested by plugins, keeping the base image under 50MB.
3. **Plugins (Userland):** Micro-tools created by the community and downloaded from external repositories. They are considered *untrusted* code and run in a heavily guarded sandbox. They never communicate directly with the operating system, but only through the Core and Official Modules.

---

## 2. Technology Stack

* **Runtime & Backend:** **Deno** (TypeScript/JavaScript). Chosen for its *secure-by-default* model. Deno allows spinning up isolated workers by assigning granular permissions (e.g., `--allow-net`, `--allow-read`).
* **Frontend:** **Vue 3 / SvelteKit**. Lightweight frameworks perfect for dynamically rendering a data-driven declarative UI (JSON).
* **Database:** **SQLite**. Built-in, zero-configuration database to save repositories, installed plugins, and permission consents.
* **Infrastructure:** A single **Docker** container housing the Deno Core, the frontend's static files, and a `/data` volume for the DB, Modules, and Plugins.

---

## 3. Execution Model (Security & Sandboxing)

Plugins are not separate containers, but packages executed by the TTYAN Core in two modes:

* **Client-Side (Browser):** For lightweight tools (e.g., calculators, Wasm-based conversions). The JS/Wasm code is sent to the browser and executed inside a **Web Worker**. It has no access to the main DOM.
* **Server-Side (Deno):** For tools requiring network or file system access. The Core starts an isolated **Deno Worker**, passing it *only* the permission flags explicitly approved by the user during installation.

---

## 4. Declarative UI (Server-Driven UI)

Plugins **do not write HTML/CSS**. Instead, they provide the frontend with a JSON schema (`ui.json`) that describes which components are needed.

* **Advantages:** 100% visual consistency (the app decides colors, padding, and styling), native support for Dark/Light mode, and zero risk of XSS (Cross-Site Scripting) attacks.

**Example of UI provided by a plugin:**
```json
{
  "layout": [
    { "type": "title", "text": "Torrent Tester" },
    { "type": "file_input", "id": "file", "accept": ".torrent" },
    { "type": "button", "action": "run_task", "label": "Analyze" }
  ]
}
```

---

## 5. Lazy Loading for Heavy Modules

To keep the container lightweight, TTYAN supports *Lazy Loading* for heavy system dependencies.

1. A plugin declares the need for a module in its manifest (e.g., `"modules": ["ttyan.ffmpeg"]`).
2. If the module is not present in the `/data/modules` volume, TTYAN prompts the user to download it.
3. TTYAN downloads the *statically compiled* version (Static Binary) suited for the host's hardware architecture (ARM64, AMD64) from an official registry.
4. The plugin utilizes the binary strictly through the protected APIs of the Deno Core.

---

## 6. Virtual File System (Auto-Sorting)

To prevent the dashboard from becoming cluttered with dozens of installed tools, plugins self-organize into a tree-structured menu.
The plugin's `manifest.json` includes a `path` property:

```json
{
  "id": "com.user.speedtest",
  "name": "Network Speedtest",
  "path": "Network/Tools",
  "entrypoint": "server.js"
}
```
The Frontend normalizes these strings to automatically generate folders and subfolders in the sidebar (e.g., `📁 Network -> 📁 Tools -> 📄 Network Speedtest`).

---

## 7. Plugin Installation Flow & Versioning

Plugins can be installed in two ways: via remote registries or via local ZIP archives.

**Remote Registry Flow:**
1. **Add Repository:** The user pastes the URL of a JSON file (Registry) containing a list of plugins. A repository can serve multiple plugins.
2. **Explore:** The frontend populates the "Catalogue/Store" view, distinguishing between installed and available plugins.
3. **Request Permissions:** The user clicks "Install" on a tool. TTYAN reads the `manifest.json` and lists the required permissions (Network, File System, Modules).
4. **Approve & Download:** If the user accepts, the plugin's files are saved to `/data/plugins`.
5. **Install Dependencies:** If required by the manifest, TTYAN downloads any missing Static Binaries.
6. **UI Integration:** The tool automatically appears in the correct folder within the sidebar, ready to use.

**Local ZIP Archive:**
Users can upload a zip file containing the plugin. The core extracts it, validates the `manifest.json`, asks for permissions, and installs it identically to a remote plugin.

**Versioning and Updates:**
Plugins support strict version control (Semantic Versioning). The core periodically (or manually via the Catalogue) checks installed plugins against known remote repositories. If a higher version exists, the user is offered a seamless update path to safely replace the old logic while retaining their data.
