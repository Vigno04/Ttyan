// ─── TTYAN Plugin Worker: Gemini Watermark Remover ───────────────────────────
// All watermark-removal logic is self-contained in this worker.
// The TTYAN host sends image File objects via the 'process_images' action.

// ── Alpha Map ────────────────────────────────────────────────────────────────
function calculateAlphaMap(bgCaptureImageData) {
  const { width, height, data } = bgCaptureImageData;
  const alphaMap = new Float32Array(width * height);
  for (let i = 0; i < alphaMap.length; i++) {
    const idx = i * 4;
    alphaMap[i] = Math.max(data[idx], data[idx + 1], data[idx + 2]) / 255.0;
  }
  return alphaMap;
}

// ── Blend Modes ──────────────────────────────────────────────────────────────
const ALPHA_THRESHOLD = 0.002;
const MAX_ALPHA = 0.99;
const LOGO_VALUE = 255;

function removeWatermark(imageData, alphaMap, position) {
  const { x, y, width, height } = position;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const imgIdx = ((y + row) * imageData.width + (x + col)) * 4;
      const alphaIdx = row * width + col;
      let alpha = alphaMap[alphaIdx];
      if (alpha < ALPHA_THRESHOLD) continue;
      alpha = Math.min(alpha, MAX_ALPHA);
      for (let c = 0; c < 3; c++) {
        const watermarked = imageData.data[imgIdx + c];
        const original = (watermarked - alpha * LOGO_VALUE) / (1.0 - alpha);
        imageData.data[imgIdx + c] = Math.max(0, Math.min(255, Math.round(original)));
      }
    }
  }
}

// ── Engine ───────────────────────────────────────────────────────────────────
// Reference background tiles are embedded as data URIs to keep the worker self-contained.
// These are the same bg_48.png and bg_96.png from the /assets/ folder, base64-encoded.
// The host must provide them as base64 strings in the 'init' payload, or we fetch them.

let alphaMaps = {};
let assetBases = {}; // { 48: ImageBitmap, 96: ImageBitmap }

async function getAlphaMap(size) {
  if (alphaMaps[size]) return alphaMaps[size];
  const bmp = assetBases[size];
  if (!bmp) throw new Error(`Asset for size ${size} not loaded`);
  // Draw to OffscreenCanvas to extract pixel data
  const oc = new OffscreenCanvas(size, size);
  const ctx = oc.getContext('2d');
  ctx.drawImage(bmp, 0, 0);
  const map = calculateAlphaMap(ctx.getImageData(0, 0, size, size));
  alphaMaps[size] = map;
  return map;
}

function getWatermarkInfo(width, height) {
  const isLarge = width > 1024 && height > 1024;
  const size = isLarge ? 96 : 48;
  const margin = isLarge ? 64 : 32;
  return { size, x: width - margin - size, y: height - margin - size, width: size, height: size };
}

async function processImageFile(file) {
  const bmp = await createImageBitmap(file);
  const oc = new OffscreenCanvas(bmp.width, bmp.height);
  const ctx = oc.getContext('2d');
  ctx.drawImage(bmp, 0, 0);
  const imageData = ctx.getImageData(0, 0, oc.width, oc.height);
  const config = getWatermarkInfo(oc.width, oc.height);
  const alphaMap = await getAlphaMap(config.size);
  removeWatermark(imageData, alphaMap, config);
  ctx.putImageData(imageData, 0, 0);
  const blob = await oc.convertToBlob({ type: 'image/png' });
  return { blob, width: bmp.width, height: bmp.height, name: file.name };
}

// ── Message Handler ──────────────────────────────────────────────────────────
self.onmessage = async function (e) {
  const { action, payload } = e.data;

  if (action === 'init') {
    // Payload: { assets: { bg48: Blob|null, bg96: Blob|null } }
    // The host provides the background tile blobs so the worker can build alpha maps.
    try {
      if (payload && payload.assets) {
        if (payload.assets.bg48) {
          assetBases[48] = await createImageBitmap(payload.assets.bg48);
        }
        if (payload.assets.bg96) {
          assetBases[96] = await createImageBitmap(payload.assets.bg96);
        }
      }
      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'error', message: 'Failed to load background assets: ' + err.message });
    }
    return;
  }

  if (action === 'process_images') {
    // Payload: { input_images: File[] }
    const files = payload && (payload.input_images || payload.files);
    if (!files || files.length === 0) {
      self.postMessage({ type: 'notify', message: 'No images provided.' });
      return;
    }

    if (!assetBases[48] && !assetBases[96]) {
      self.postMessage({ type: 'error', message: 'Assets not initialized. Please re-open the plugin.' });
      return;
    }

    self.postMessage({ type: 'notify', message: `Processing ${files.length} image(s)…` });

    const results = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const result = await processImageFile(file);
        const cleanName = `clean_${file.name.replace(/\.[^/.]+$/, '')}.png`;
        results.push({
          name: cleanName,
          blob: result.blob,
          width: result.width,
          height: result.height,
          originalName: file.name
        });
        self.postMessage({ type: 'progress', current: i + 1, total: files.length });
      } catch (err) {
        self.postMessage({ type: 'notify', message: `Failed to process ${file.name}: ${err.message}` });
      }
    }

    self.postMessage({
      type: 'update_ui',
      id: 'output_images',
      value: results
    });

    self.postMessage({
      type: 'notify',
      message: `Done! Processed ${results.length} of ${files.length} image(s).`
    });
    
    self.postMessage({ type: 'ready' });
    return;
  }
};
