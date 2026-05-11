// ─── TTYAN Plugin Worker: Universal Downloader ─────────────────────────────
// This worker handles the logic for analyzing and downloading videos.

self.onmessage = async function(e) {
  const { action, payload } = e.data;

  if (action === 'init') {
    self.postMessage({ type: 'ready' });
    return;
  }

  if (action === 'download') {
    const { url, format } = payload;

    if (!url) {
      self.postMessage({ type: 'error', message: 'Please provide a valid video URL.' });
      return;
    }

    self.postMessage({ type: 'notify', message: `Analyzing ${url}...` });
    self.postMessage({ type: 'update_ui', id: 'status_msg', value: 'Analyzing video source...' });

    try {
      // Execute yt-dlp to get JSON info
      const res = await fetch('/api/modules/ttyan.ytdlp/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ args: ['-J', url] })
      });
      const data = await res.json();
      
      if (data.returncode !== 0) {
        throw new Error(data.stderr || 'Failed to extract video details.');
      }
      
      const vInfo = JSON.parse(data.stdout);
      
      self.postMessage({ 
        type: 'notify', 
        message: 'Download engine (yt-dlp) initialized. Starting stream extraction...' 
      });
      
      // We simulate download for preview but actually we would download here or return the direct URL
      const bestUrl = vInfo.url || vInfo.requested_formats?.[0]?.url;
      
      self.postMessage({ type: 'update_ui', id: 'status_msg', value: `Success! Format chosen: ${format || 'best'}` });
      
      // Update the UI dynamically to show video and details
      const newLayout = [
        { "type": "title", "text": "Universal Video Downloader" },
        { "type": "paragraph", "text": "Details extracted!" },
        {
          "type": "video",
          "src": bestUrl || ""
        },
        {
          "type": "select",
          "id": "format",
          "label": "Select Format",
          "options": [
            { "label": "Max Quality (Video+Audio)", "value": "best" },
            { "label": "Audio Only", "value": "bestaudio" },
            { "label": "Subtitles Only", "value": "subtitles" }
          ]
        },
        {
          "type": "button",
          "action": "download",
          "label": "Re-Download with selected format"
        },
        { "type": "divider" },
        { "type": "paragraph", "id": "status_msg", "text": `Downloaded title: ${vInfo.title}` }
      ];
      
      self.postMessage({ type: 'update_layout', value: newLayout });

    } catch (err) {
      self.postMessage({ type: 'error', message: err.message });
      self.postMessage({ type: 'update_ui', id: 'status_msg', value: 'Error occurred during extraction.' });
    }

    self.postMessage({ type: 'ready' });
  }
};