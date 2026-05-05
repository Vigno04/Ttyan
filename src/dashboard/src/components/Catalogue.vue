<template>
  <div class="catalogue-view">
    <div class="page-header">
      <h2>Plugin Catalogue</h2>
      <div class="tabs">
        <button
          v-for="tab in visibleTabs"
          :key="tab"
          class="tab-btn"
          :class="{ active: currentTab === tab }"
          @click="currentTab = tab"
        >
          {{ tab }}
        </button>
      </div>
    </div>

    <!-- Explore Tab -->
    <div v-if="currentTab === 'Explore'" class="tab-content">
      <div class="search-bar">
        <input type="text" v-model="searchQuery" placeholder="Search plugins..." class="input-glass" />
      </div>

      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <span>Fetching plugins from repositories...</span>
      </div>

      <div v-else-if="fetchError" class="empty-state error-state">
        ⚠ {{ fetchError }}
      </div>

      <div v-else class="plugins-list">
        <div class="plugin-card glass" v-for="plugin in filteredPlugins" :key="plugin.id">
          <div class="plugin-banner">
            <img v-if="plugin.image" :src="plugin.image" :alt="plugin.name" class="plugin-banner-img" />
            <div v-else class="plugin-banner-placeholder" :style="{ background: pluginGradient(plugin.name) }">
              <span class="plugin-initial">{{ plugin.name.charAt(0) }}</span>
            </div>
          </div>
          <div class="plugin-header">
            <h3>{{ plugin.name }}</h3>
            <span class="version badge">v{{ plugin.version }}</span>
          </div>
          <p class="description">{{ plugin.description }}</p>
          <div class="plugin-footer">
            <span class="author">by {{ plugin.author }}</span>
            <div v-if="isAdmin">
              <button class="btn btn-primary" v-if="!isInstalled(plugin.id)" @click="installPlugin(plugin)">Install</button>
              <button class="btn btn-disabled" v-else disabled>Installed</button>
            </div>
            <span v-else class="status-label">{{ isInstalled(plugin.id) ? 'Installed' : 'Available' }}</span>
          </div>
        </div>

        <div v-if="filteredPlugins.length === 0" class="empty-state">
          No plugins found.
        </div>
      </div>
    </div>

    <!-- Installed Tab -->
    <div v-if="currentTab === 'Installed'" class="tab-content">
      <div class="actions-bar" v-if="isAdmin">
        <label class="btn btn-outline import-btn">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          Import ZIP
          <input type="file" accept=".zip" @change="importZip" hidden />
        </label>
      </div>

      <div class="plugins-list">
        <div class="plugin-card glass" v-for="plugin in installedPlugins" :key="plugin.id">
          <div class="plugin-banner">
            <img v-if="plugin.image" :src="plugin.image" :alt="plugin.name" class="plugin-banner-img" />
            <div v-else class="plugin-banner-placeholder" :style="{ background: pluginGradient(plugin.name) }">
              <span class="plugin-initial">{{ plugin.name.charAt(0) }}</span>
            </div>
          </div>
          <div class="plugin-header">
            <h3>{{ plugin.name }}</h3>
            <div class="version-info">
              <span class="version badge">v{{ plugin.version }}</span>
              <span class="update-badge" v-if="hasUpdate(plugin)">Update v{{ getLatestVersion(plugin.id) }}</span>
            </div>
          </div>
          <p class="description">{{ plugin.description }}</p>
          <div class="plugin-footer" v-if="isAdmin">
            <button class="btn btn-danger btn-sm" @click="uninstallPlugin(plugin.id)">Uninstall</button>
            <button class="btn btn-success btn-sm" v-if="hasUpdate(plugin)" @click="updatePlugin(plugin)">Update</button>
          </div>
        </div>

        <div v-if="installedPlugins.length === 0" class="empty-state">
          No plugins installed yet.
        </div>
      </div>
    </div>

    <!-- Repositories Tab (admin only) -->
    <div v-if="currentTab === 'Repositories'" class="tab-content">
      <div class="repo-form glass">
        <input v-model="newRepoUrl" type="url" placeholder="https://example.com/ttyan-registry.json" class="input-glass" />
        <button class="btn btn-primary" @click="addRepo" :disabled="!newRepoUrl">Add Source</button>
      </div>

      <div class="repo-list">
        <div class="repo-item glass" v-for="(repo, index) in repositories" :key="index">
          <div class="repo-info">
            <span class="repo-url">{{ repo.url }}</span>
            <span class="repo-status" :class="repo.status">● {{ repo.status }}</span>
          </div>
          <div class="repo-actions">
            <button class="btn btn-sm btn-outline" @click="refreshRepo(repo)">Refresh</button>
            <button class="btn btn-icon btn-danger" @click="removeRepo(index)">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  user: Object,
  installedPlugins: Array
})

const emit = defineEmits(['plugins-updated'])

const currentTab = ref('Explore')
const newRepoUrl = ref('')
const searchQuery = ref('')
const isLoading = ref(false)
const fetchError = ref(null)

const isAdmin = computed(() => props.user?.role?.toLowerCase() === 'admin')
const visibleTabs = computed(() => {
  const tabs = ['Explore', 'Installed']
  if (isAdmin.value) tabs.push('Repositories')
  return tabs
})

// ── Repositories ──────────────────────────────────────────────────────────────

const DEFAULT_REPOS = [
  { url: 'https://github.com/Vigno04/Ttyan/blob/develop/OfficialPlugins/registry.json', status: 'unknown' }
]

const repositories = ref(
  JSON.parse(localStorage.getItem('ttyan_repositories') || 'null') ?? DEFAULT_REPOS
)

const saveRepos = () => {
  localStorage.setItem('ttyan_repositories', JSON.stringify(repositories.value))
}

/**
 * Convert a GitHub blob viewer URL to the raw content URL so we can fetch JSON.
 * Handles both blob and tree URLs.
 */
const toRawUrl = (url) => {
  // Already raw
  if (url.includes('raw.githubusercontent.com')) return url
  // github.com/USER/REPO/blob/BRANCH/PATH  →  raw.githubusercontent.com/USER/REPO/BRANCH/PATH
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/(blob|tree)\/([^/]+)\/(.+)/)
  if (match) {
    const [, user, repo, , branch, filePath] = match
    return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filePath}`
  }
  return url
}

// ── Available plugins (merged from all repos) ─────────────────────────────────

const availablePlugins = ref([])

const fetchAllRepos = async () => {
  isLoading.value = true
  fetchError.value = null
  const merged = []
  const seen = new Set()

  for (const repo of repositories.value) {
    try {
      const rawUrl = toRawUrl(repo.url)
      const res = await fetch(rawUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      
      const pluginFolders = await res.json() // Array of strings like ["OfficialPlugins/TrackerCleaner"]
      
      // Get the base URL by removing the registry.json part
      const base = repo.url.substring(0, repo.url.lastIndexOf('/'))

      for (const folderPath of pluginFolders) {
        try {
          // If folderPath is "A/B" and base ends with "/A", we should use parent of base.
          // This avoids doubling folder names if the registry is inside the plugin folder.
          let effectiveBase = base;
          const folderParts = folderPath.split('/');
          const baseParts = base.split('/');
          
          if (folderParts.length > 0 && baseParts.length > 0) {
            const firstFolder = folderParts[0];
            const lastBase = baseParts[baseParts.length - 1];
            if (firstFolder === lastBase) {
              effectiveBase = baseParts.slice(0, -1).join('/');
            }
          }

          const manifestUrl = `${effectiveBase}/${folderPath}/manifest.json`
          const manifestRes = await fetch(toRawUrl(manifestUrl))
          if (manifestRes.ok) {
            const manifest = await manifestRes.json()
            if (!seen.has(manifest.id)) {
              seen.add(manifest.id)
              // basePath is the folder containing the manifest
              manifest.basePath = toRawUrl(`${effectiveBase}/${folderPath}`)
              
              // Resolve relative image paths
              if (manifest.image && !manifest.image.startsWith('http')) {
                manifest.image = toRawUrl(`${effectiveBase}/${folderPath}/${manifest.image}`)
              }
              
              merged.push(manifest)
            }
          }
        } catch (me) {
          console.warn(`[TTYAN] Failed to fetch manifest for ${folderPath}:`, me)
        }
      }
      repo.status = 'online'
    } catch (e) {
      repo.status = 'offline'
      console.warn(`[TTYAN] Failed to fetch repo ${repo.url}:`, e)
    }
  }

  saveRepos()
  availablePlugins.value = merged
  isLoading.value = false
  if (merged.length === 0 && repositories.value.length > 0) {
    fetchError.value = 'No plugins found. Check that your repository URLs are correct.'
  }
}

const filteredPlugins = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return availablePlugins.value
  return availablePlugins.value.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.description?.toLowerCase().includes(q) ||
    p.author?.toLowerCase().includes(q)
  )
})

// ── Installed plugins ──────────────────────────────────────────────────────────

const saveInstalled = (newList) => {
  localStorage.setItem('ttyan_installed_plugins', JSON.stringify(newList))
  emit('plugins-updated')
}

const isInstalled = (id) => props.installedPlugins.some(p => p.id === id)

const getLatestVersion = (id) => availablePlugins.value.find(p => p.id === id)?.version ?? null

const hasUpdate = (plugin) => {
  const latest = getLatestVersion(plugin.id)
  return latest && latest !== plugin.version
}

const installPlugin = (plugin) => {
  if (!isInstalled(plugin.id)) {
    saveInstalled([...props.installedPlugins, { ...plugin }])
  }
}

const uninstallPlugin = (id) => {
  saveInstalled(props.installedPlugins.filter(p => p.id !== id))
}

const updatePlugin = (plugin) => {
  const index = props.installedPlugins.findIndex(p => p.id === plugin.id)
  if (index !== -1) {
    const latest = availablePlugins.value.find(p => p.id === plugin.id)
    if (latest) {
      const updated = [...props.installedPlugins]
      updated[index] = { ...latest }
      saveInstalled(updated)
    }
  }
}

const importZip = (event) => {
  const file = event.target.files[0]
  if (file) alert(`ZIP import not yet implemented: ${file.name}`)
}

// ── Repositories management ────────────────────────────────────────────────────

const addRepo = async () => {
  if (newRepoUrl.value && !repositories.value.some(r => r.url === newRepoUrl.value)) {
    repositories.value.push({ url: newRepoUrl.value, status: 'unknown' })
    saveRepos()
    newRepoUrl.value = ''
    await fetchAllRepos()
  }
}

const removeRepo = (index) => {
  repositories.value.splice(index, 1)
  saveRepos()
  fetchAllRepos()
}

const refreshRepo = async (repo) => {
  await fetchAllRepos()
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const GRADIENTS = [
  'linear-gradient(135deg, #3b82f6, #6366f1)',
  'linear-gradient(135deg, #8b5cf6, #ec4899)',
  'linear-gradient(135deg, #10b981, #3b82f6)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #14b8a6, #6366f1)',
]
const pluginGradient = (name) => GRADIENTS[name.charCodeAt(0) % GRADIENTS.length]

onMounted(fetchAllRepos)
</script>

<style scoped>
.catalogue-view {
  padding: 24px;
  max-width: 1000px;
  margin: 0 auto;
}

/* ── Banner ── */
.plugin-banner {
  width: 100%;
  height: 100px;
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-bottom: 4px;
  flex-shrink: 0;
}

.plugin-banner-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.plugin-banner-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.plugin-initial {
  font-size: 2.5rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  text-transform: uppercase;
  user-select: none;
}

/* ── Header ── */
.page-header {
  margin-bottom: 24px;
}
.page-header h2 {
  margin-top: 0;
  margin-bottom: 16px;
  color: var(--text-primary);
}

.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 8px;
}

.tab-btn {
  padding: 8px 18px;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.tab-btn:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}
.tab-btn.active {
  background-color: var(--accent-light);
  color: var(--accent-color);
}

.tab-content {
  animation: fadeIn var(--transition-normal);
  padding-top: 20px;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Search / actions ── */
.search-bar,
.actions-bar {
  margin-bottom: 20px;
}

/* ── Plugin grid ── */
.plugins-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.plugin-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-radius: var(--radius-lg);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}
.plugin-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.plugin-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.plugin-header h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--text-primary);
}

.version-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.badge {
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 500;
}

.update-badge {
  background-color: var(--accent-light);
  color: var(--accent-color);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
}

.description {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.55;
  flex-grow: 1;
}

.plugin-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.author {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.status-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--accent-color);
  background-color: var(--accent-light);
  padding: 3px 10px;
  border-radius: var(--radius-full);
}

/* ── Buttons ── */
.btn {
  padding: 7px 16px;
  border-radius: var(--radius-md);
  border: none;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: inherit;
}
.btn-sm    { padding: 4px 10px; font-size: 0.82rem; }
.btn-primary   { background-color: var(--accent-color); color: #fff; }
.btn-primary:hover { background-color: var(--accent-hover); }
.btn-success   { background-color: #10b981; color: #fff; }
.btn-success:hover { background-color: #059669; }
.btn-danger    { background-color: transparent; color: #ef4444; border: 1px solid #ef4444; }
.btn-danger:hover  { background-color: rgba(239,68,68,.12); }
.btn-outline   { background-color: transparent; border: 1px solid var(--border-color); color: var(--text-primary); }
.btn-outline:hover { background-color: var(--bg-secondary); }
.btn-disabled  { background-color: var(--bg-tertiary); color: var(--text-secondary); cursor: not-allowed; }
.btn-icon      { width: 32px; height: 32px; padding: 0; justify-content: center; }

.import-btn { cursor: pointer; }

/* ── Loading / error ── */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 60px;
  color: var(--text-secondary);
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  color: var(--text-secondary);
  padding: 48px 24px;
  grid-column: 1 / -1;
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-lg);
  font-size: 0.95rem;
}

.error-state {
  color: #f87171;
  border-color: rgba(239,68,68,.3);
}

/* ── Repo tab ── */
.repo-form {
  display: flex;
  gap: 12px;
  padding: 16px;
  margin-bottom: 20px;
  border-radius: var(--radius-lg);
}

.repo-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.repo-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-radius: var(--radius-md);
}

.repo-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.repo-url {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 500px;
}

.repo-status        { font-size: 0.78rem; }
.repo-status.online  { color: #10b981; }
.repo-status.offline { color: #ef4444; }
.repo-status.unknown { color: var(--text-muted); }

.repo-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  margin-left: 16px;
}
</style>