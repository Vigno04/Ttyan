// Web Worker script for Tracker Cleaner

let savedTrackers = new Set();

// In a real TTYAN mock, we would get the user context. For now we use the worker state.
self.onmessage = function(e) {
  const { action, payload, user } = e.data;
  
  if (action === "init") {
    // Attempt to load from some secure core key-value store in the future
    if (payload && payload.savedList) {
      payload.savedList.forEach(t => savedTrackers.add(t));
    }
    self.postMessage({ type: "update_ui", id: "output_trackers", value: Array.from(savedTrackers).join('\n') });
    self.postMessage({ type: "ready" });
  }

  if (action === "process_trackers") {
    const rawInput = payload.input_trackers || "";
    const lines = rawInput.split(/\r?\n/);
    
    let addedCount = 0;
    
    lines.forEach(line => {
      // Clean spaces before and after
      const cleanLine = line.trim();
      
      // Ensure it looks like a tracker (starts with udp, http, https, wss)
      if (cleanLine.length > 0 && /^(udp|http|https|wss):\/\//.test(cleanLine)) {
        if (!savedTrackers.has(cleanLine)) {
          savedTrackers.add(cleanLine);
          addedCount++;
        }
      }
    });

    const outputText = Array.from(savedTrackers).join('\n');
    
    self.postMessage({ 
      type: "update_ui", 
      id: "output_trackers", 
      value: outputText
    });

    self.postMessage({
      type: "update_ui",
      id: "input_trackers",
      value: ""
    });

    self.postMessage({
      type: "notify",
      message: `Processed. Added ${addedCount} new trackers.`
    });

    // Signal Core to save state for this user
    self.postMessage({
      type: "save_state",
      key: "savedList",
      value: Array.from(savedTrackers)
    });

    self.postMessage({ type: "ready" });
  }

  if (action === "copy_trackers") {
    // Instruct the frontend to copy the output field
    self.postMessage({
      type: "copy_clipboard",
      value: Array.from(savedTrackers).join('\n')
    });
    self.postMessage({ type: "ready" });
  }

  if (action === "clear_trackers") {
    savedTrackers.clear();
    self.postMessage({ type: "update_ui", id: "output_trackers", value: "" });
    self.postMessage({ type: "save_state", key: "savedList", value: [] });
    self.postMessage({ type: "notify", message: "Saved trackers cleared." });
    self.postMessage({ type: "ready" });
  }
};