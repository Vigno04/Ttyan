<template>
  <div class="plugin-runner glass">
    <div v-for="(component, index) in layout" :key="index" class="dynamic-component">
      
      <h2 v-if="component.type === 'title'">{{ component.text }}</h2>
      
      <p v-else-if="component.type === 'paragraph'" class="description-text">{{ component.text }}</p>
      
      <div v-else-if="component.type === 'divider'" class="menu-divider"></div>
      
      <!-- Textarea component -->
      <div v-else-if="component.type === 'textarea'" class="form-group">
        <textarea 
          class="input-glass" 
          v-model="state[component.id]" 
          :placeholder="component.placeholder" 
          :rows="component.rows" 
          :readonly="component.readonly"
        ></textarea>
      </div>

      <!-- Image Upload component with Previews -->
      <div v-else-if="component.type === 'image-upload'" class="form-group">
        <div 
          class="upload-area" 
          @click="$refs['fileInput_' + component.id][0].click()"
          @dragover.prevent="dragOver"
          @dragleave.prevent="dragLeave"
          @drop.prevent="handleDrop($event, component.id)"
        >
          <svg viewBox="0 0 24 24" class="upload-icon" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <div class="upload-label">{{ component.label }}</div>
          <div class="upload-hint" v-if="component.hint">{{ component.hint }}</div>
          <input 
            type="file" 
            :ref="'fileInput_' + component.id" 
            :accept="component.accept" 
            :multiple="component.multiple" 
            @change="handleFileSelect($event, component.id)" 
            hidden 
          />
        </div>
        
        <!-- Input Previews -->
        <div v-if="state[component.id]?.length" class="previews-container">
          <div v-for="(file, idx) in state[component.id]" :key="idx" class="preview-card glass">
            <div class="preview-img-container">
              <img :src="getFileUrl(file)" class="preview-img" />
            </div>
            <span class="preview-name">{{ file.name }}</span>
          </div>
        </div>
      </div>

      <!-- Image Output component -->
      <div v-else-if="component.type === 'image-output'" class="image-results">
        <div v-if="!state[component.id] || state[component.id].length === 0" class="empty-results">
          No results yet.
        </div>
        <div v-else class="results-grid">
          <div v-for="(img, idx) in state[component.id]" :key="idx" class="result-card glass">
            <div class="result-preview">
              <img :src="getImageUrl(img.blob)" alt="Result" />
            </div>
            <div class="result-footer">
              <span class="result-name">{{ img.name }}</span>
              <button class="btn btn-sm btn-primary" @click="downloadImage(img)">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download
              </button>
            </div>
          </div>
        </div>
      </div>

      <button 
        v-else-if="component.type === 'button'" 
        class="btn btn-primary main-action-btn" 
        @click="triggerAction(component.action)"
        :disabled="isProcessing"
      >
        <div v-if="isProcessing" class="mini-spinner"></div>
        <span>{{ isProcessing ? 'Processing...' : component.label }}</span>
      </button>

    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  plugin: Object,
  user: Object,
  uiJson: Object
})

const layout = ref([])
const state = ref({})
const isProcessing = ref(false)
const fileUrlCache = new Map()
let worker = null

const getUserStoreKey = () => `ttyan_store_${props.user?.username}_${props.plugin?.id}`

// Watch for UI schema changes
watch(() => props.uiJson, (newUi) => {
  layout.value = newUi?.layout || []
  state.value = {}
}, { immediate: true })

/**
 * Convert a GitHub blob viewer URL to the raw content URL so we can fetch JSON.
 */
const toRawUrl = (url) => {
  if (!url) return url
  if (url.includes('raw.githubusercontent.com')) return url
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/(blob|tree)\/([^/]+)\/(.+)/)
  if (match) {
    const [, user, repo, , branch, filePath] = match
    return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filePath}`
  }
  return url
}

const initWorker = async () => {
  if (worker) {
    worker.terminate()
    worker = null
  }
  
  const { basePath, entrypoint } = props.plugin || {}
  if (!basePath || !entrypoint) return

  try {
    isProcessing.value = true
    const workerUrl = `${basePath}/${entrypoint}`
    const rawWorkerUrl = toRawUrl(workerUrl)
    
    // Fetch the worker script text to create a local Blob URL (avoids CORS/Security issues with remote workers)
    const res = await fetch(rawWorkerUrl)
    if (!res.ok) throw new Error(`Failed to fetch worker script: ${res.status}`)
    const scriptText = await res.text()
    const blob = new Blob([scriptText], { type: 'application/javascript' })
    const blobUrl = URL.createObjectURL(blob)

    worker = new Worker(blobUrl)
    
    worker.onmessage = async (e) => {
      const { type, id, value, message } = e.data
      
      if (type === 'update_ui') {
        state.value[id] = value
      } else if (type === 'notify') {
        console.log(`[Plugin ${props.plugin.id}]: ${message}`)
      } else if (type === 'ready') {
        isProcessing.value = false
      } else if (type === 'error') {
        alert(`Error: ${message}`)
        isProcessing.value = false
      }
    }

    const store = JSON.parse(localStorage.getItem(getUserStoreKey()) || '{}')
    
    // Auto-probe for assets
    const [bg48, bg96] = await Promise.all([
      fetch(toRawUrl(`${basePath}/assets/bg_48.png`)).then(r => r.ok ? r.blob() : null).catch(() => null),
      fetch(toRawUrl(`${basePath}/assets/bg_96.png`)).then(r => r.ok ? r.blob() : null).catch(() => null)
    ])

    worker.postMessage({
      action: 'init',
      payload: { 
        ...store, 
        assets: { bg48, bg96 } 
      }
    })
  } catch (err) {
    console.error('Failed to initialize worker:', err)
    isProcessing.value = false
  }
}

// Watch for plugin changes to re-initialize the worker
// This ensures that switching plugins via the sidebar works correctly
watch(() => props.plugin?.id, (newId) => {
  if (newId) {
    initWorker()
  }
}, { immediate: true })

onUnmounted(() => {
  if (worker) worker.terminate()
  fileUrlCache.forEach(url => URL.revokeObjectURL(url))
})

const triggerAction = (action) => {
  if (worker) {
    isProcessing.value = true
    // Clone state to avoid Proxy cloning issues
    const payload = JSON.parse(JSON.stringify(state.value))
    worker.postMessage({ action, payload })
  }
}

const handleFileSelect = (event, id) => {
  state.value[id] = Array.from(event.target.files)
}

const handleDrop = (event, id) => {
  state.value[id] = Array.from(event.dataTransfer.files)
}

const getFileUrl = (file) => {
  if (!fileUrlCache.has(file)) {
    fileUrlCache.set(file, URL.createObjectURL(file))
  }
  return fileUrlCache.get(file)
}

const getImageUrl = (blob) => {
  return URL.createObjectURL(blob)
}

const downloadImage = (img) => {
  const url = URL.createObjectURL(img.blob)
  const a = document.createElement('a')
  a.href = url
  a.download = img.name
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.plugin-runner {
  padding: 40px;
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 900px;
  margin: 0 auto 60px auto;
}

.description-text {
  color: var(--text-secondary);
  font-size: 1rem;
  line-height: 1.6;
}

.menu-divider {
  height: 1px;
  background-color: var(--border-color);
  margin: 8px 0;
}

/* Upload Area */
.upload-area {
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-lg);
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  cursor: pointer;
  transition: all var(--transition-normal);
  background-color: var(--bg-secondary);
}

.upload-area:hover {
  border-color: var(--accent-color);
  background-color: var(--bg-tertiary);
}

.upload-icon {
  width: 48px;
  height: 48px;
  color: var(--accent-color);
}

.upload-label {
  font-weight: 600;
  font-size: 1.1rem;
}

/* Previews */
.previews-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.preview-card {
  padding: 8px;
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-img-container {
  aspect-ratio: 1;
  background-color: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-name {
  font-size: 0.75rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}

/* Results */
.image-results {
  margin-top: 16px;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}

.result-card {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-preview {
  aspect-ratio: 16/9;
  background-color: var(--bg-tertiary);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.result-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.result-footer {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.result-name {
  font-size: 0.85rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-primary {
  background-color: var(--accent-color);
  color: white;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all var(--transition-fast);
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--accent-hover);
  transform: translateY(-2px);
}

.main-action-btn {
  width: 100%;
  padding: 16px;
  font-size: 1.1rem;
  margin-top: 16px;
}

.mini-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-results {
  text-align: center;
  padding: 60px;
  color: var(--text-muted);
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-lg);
  font-style: italic;
}
</style>