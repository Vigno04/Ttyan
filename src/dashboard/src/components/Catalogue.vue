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
        <div class="plugin-card glass" v-for="plugin in filteredPlugins" :key="plugin.id" @click="openDetails(plugin)">
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
            <div class="footer-actions">
              <button 
                v-if="!isInstalled(plugin.id)" 
                class="btn btn-primary btn-sm" 
                @click.stop="fastInstall(plugin)"
              >Install</button>
              <span v-else class="status-label installed">Installed</span>
            </div>
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
        <div class="plugin-card glass" v-for="plugin in installedPlugins" :key="plugin.id" @click="openDetails(plugin)">
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
          <div class="plugin-footer">
            <span class="author">by {{ plugin.author }}</span>
            <span class="status-label installed">Installed</span>
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

    <!-- Plugin Details Modal -->
    <div v-if="selectedPlugin" class="modal-overlay" @click.self="selectedPlugin = null">
      <div class="modal detail-modal">
        <button class="close-btn" @click="selectedPlugin = null">&times;</button>
        
        <div class="detail-container">
          <!-- Left Column: Info & History -->
          <div class="detail-main">
            <section class="detail-header">
              <h1>{{ selectedPlugin.name }}</h1>
              <p class="detail-description">{{ selectedPlugin.description }}</p>
              <div class="source-info">
                <span>Source: {{ selectedPlugin.basePath }}</span>
              </div>
            </section>

            <section class="revision-history">
              <h3>Revision History</h3>
              <div class="history-list">
                <div 
                  v-for="v in getPluginVersions(selectedPlugin.id)" 
                  :key="v.version" 
                  class="history-item glass" 
                  @click="selectVersion(v)"
                >
                  <div class="history-row">
                    <span class="history-v">{{ v.version }} — {{ v.date || 'Stable' }}</span>
                    <div class="history-arrow">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" :class="{ 'rotated': expandedHistory === v.version }">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                  </div>
                  <div v-if="expandedHistory === v.version" class="history-changes">
                    <p>{{ v.changes || 'No changelog provided for this version.' }}</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <!-- Right Column: Actions & Meta -->
          <div class="detail-sidebar">
            <div class="detail-banner glass">
              <img v-if="selectedPlugin.image" :src="selectedPlugin.image" :alt="selectedPlugin.name" />
              <div v-else class="banner-placeholder" :style="{ background: pluginGradient(selectedPlugin.name) }">
                <span>{{ selectedPlugin.name }}</span>
              </div>
            </div>

            <div class="detail-actions" v-if="isAdmin">
              <button 
                class="btn btn-primary btn-block" 
                @click="serverInstall(activeVersion)"
                :disabled="isActionLoading"
              >
                <div v-if="isActionLoading" class="mini-spinner"></div>
                <span>{{ isInstalled(activeVersion.id) && isCurrentVersion(activeVersion) ? 'Re-install' : 'Install v' + activeVersion.version }}</span>
              </button>
              
              <button 
                v-if="isInstalled(activeVersion.id)"
                class="btn btn-danger btn-block" 
                @click="serverUninstall(activeVersion.id)"
                :disabled="isActionLoading"
              >
                <div v-if="isActionLoading" class="mini-spinner"></div>
                <span>Uninstall</span>
              </button>
            </div>

            <div class="info-table glass">
              <div class="info-row">
                <span class="info-label">Status</span>
                <span class="info-value" :class="isInstalled(activeVersion.id) ? 'text-success' : 'text-muted'">
                  {{ isInstalled(activeVersion.id) ? (isCurrentVersion(activeVersion) ? 'Active' : 'Installed (Other version)') : 'Not Installed' }}
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">Version</span>
                <span class="info-value">{{ activeVersion.version }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Developer</span>
                <span class="info-value">{{ activeVersion.author }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Repository</span>
                <span class="info-value text-accent">Universal repository</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Installation Confirmation Modal (Permissions) -->
    <div v-if="confirmingPlugin" class="modal-overlay" @click.self="confirmingPlugin = null">
      <div class="modal detail-modal confirmation-modal">
        <button class="close-btn" @click="confirmingPlugin = null">&times;</button>
        
        <div class="modal-content-inner">
          <h3>Install {{ confirmingPlugin.name }}</h3>
          <p class="modal-hint">Please review the modules and permissions requested by this plugin.</p>

          <!-- Required Modules Section -->
          <div v-if="confirmingPlugin.modules?.length" class="modules-requirement glass">
            <div class="section-title">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
              <h4>Required Modules</h4>
            </div>
            <div class="modules-list">
              <div v-for="mod in confirmingPlugin.modules" :key="mod" class="module-item">
                <div class="module-info">
                  <span class="module-id">{{ mod }}</span>
                  <div class="status-indicator">
                    <span :class="['status-dot', isModuleInstalled(mod) ? 'installed' : 'missing']"></span>
                    <span class="status-text">{{ isModuleInstalled(mod) ? 'Installed' : 'Missing' }}</span>
                  </div>
                </div>
                <button 
                  v-if="!isModuleInstalled(mod)" 
                  class="btn btn-sm btn-outline" 
                  @click="installModule(mod)"
                  :disabled="isActionLoading"
                >
                  Install
                </button>
                <span v-else class="check-icon">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#10b981" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </span>
              </div>
            </div>
          </div>
          
          <div class="permissions-list">
            <!-- Low Risk Tier -->
            <div v-if="tierCategorized.low.length" class="permission-tier low-tier">
              <div class="tier-header" @click="expandedTiers.low = !expandedTiers.low">
                <h4><span class="tier-icon">🟢</span> Low Risk ({{ tierCategorized.low.length }})</h4>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" :class="{ 'rotated': expandedTiers.low }">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              <ul v-if="expandedTiers.low" class="tier-content">
                <li v-for="(item, i) in tierCategorized.low" :key="'l'+i">
                  <div class="perm-info" :title="item.reason">
                    <span class="perm-label">{{ item.label }}</span>
                  </div>
                </li>
              </ul>
            </div>
            
            <!-- Medium Risk Tier -->
            <div v-if="tierCategorized.medium.length" class="permission-tier medium-tier">
              <div class="tier-header" @click="expandedTiers.medium = !expandedTiers.medium">
                <h4><span class="tier-icon">🟡</span> Medium Risk ({{ tierCategorized.medium.length }})</h4>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" :class="{ 'rotated': expandedTiers.medium }">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              <ul v-if="expandedTiers.medium" class="tier-content">
                <li v-for="(item, i) in tierCategorized.medium" :key="'m'+i">
                  <div class="perm-info" :title="item.reason">
                    <span class="perm-label">{{ item.label }}</span>
                  </div>
                </li>
              </ul>
            </div>
            
            <!-- High Risk Tier -->
            <div v-if="tierCategorized.high.length" class="permission-tier high-tier">
              <div class="tier-header" @click="expandedTiers.high = !expandedTiers.high">
                <h4><span class="tier-icon">🔴</span> High Risk ({{ tierCategorized.high.length }})</h4>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" :class="{ 'rotated': expandedTiers.high }">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              <ul v-if="expandedTiers.high" class="tier-content">
                <li v-for="(item, i) in tierCategorized.high" :key="'h'+i">
                  <div class="perm-info" :title="item.reason">
                    <span class="perm-label">{{ item.label }}</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-outline" @click="confirmingPlugin = null">Cancel</button>
            <button class="btn btn-primary" @click="confirmServerInstall" :disabled="isActionLoading">
              <div v-if="isActionLoading" class="mini-spinner"></div>
              <span>Confirm & Install</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import securityRepos from '../assets/security_repositories.json'
import securityDomains from '../assets/security_domains.json'
import securityPermissions from '../assets/security_permissions.json'

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
const selectedPlugin = ref(null)
const confirmingPlugin = ref(null)
const tierCategorized = ref({ low: [], medium: [], high: [] })
const expandedTiers = ref({ low: false, medium: true, high: true })
const isActionLoading = ref(false)
const expandedHistory = ref(null)
const activeVersion = ref(null)
const installedModules = ref([])

const isModuleInstalled = (id) => installedModules.value.includes(id)

const isAdmin = computed(() => props.user?.role?.toLowerCase() === 'admin')
const visibleTabs = computed(() => {
  const tabs = ['Explore', 'Installed']
  if (isAdmin.value) tabs.push('Repositories')
  return tabs
})

const isCurrentVersion = (plugin) => {
  const installed = props.installedPlugins.find(p => p.id === plugin.id)
  return installed && installed.version === plugin.version
}

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

const toRawUrl = (url) => {
  if (url.includes('raw.githubusercontent.com')) return url
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/(blob|tree)\/([^/]+)\/(.+)/)
  if (match) {
    const [, user, repo, , branch, filePath] = match
    return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filePath}`
  }
  return url
}

// ── Available plugins (merged from all repos) ─────────────────────────────────

const availablePlugins = ref([])
const pluginVersions = ref({})
const selectedVersions = ref({})

const fetchAllRepos = async () => {
  isLoading.value = true
  fetchError.value = null
  const mergedMap = new Map()

  for (const repo of repositories.value) {
    try {
      const rawUrl = toRawUrl(repo.url)
      const res = await fetch(rawUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      
      const repoData = await res.json()
      
      let pluginFolders = []
      const availableModules = (!Array.isArray(repoData) && repoData.modules) ? repoData.modules : {}
      
      if (Array.isArray(repoData)) {
        pluginFolders = repoData
      } else if (repoData.plugins) {
        if (Array.isArray(repoData.plugins)) {
          pluginFolders = repoData.plugins
        } else {
          for (const pluginKey in repoData.plugins) {
            const versionsObj = repoData.plugins[pluginKey];
            for (const version in versionsObj) {
              pluginFolders.push(versionsObj[version]);
            }
          }
        }
      }
      
      const base = repo.url.substring(0, repo.url.lastIndexOf('/'))

      for (const folderPath of pluginFolders) {
        try {
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
              manifest.basePath = toRawUrl(`${effectiveBase}/${folderPath}`)
              manifest.registryUrl = repo.url
            
            if (manifest.image && !manifest.image.startsWith('http')) {
              manifest.image = toRawUrl(`${effectiveBase}/${folderPath}/${manifest.image}`)
            }
            
            if (!mergedMap.has(manifest.id)) {
              mergedMap.set(manifest.id, [])
            }
            const existingVersions = mergedMap.get(manifest.id)
            if (!existingVersions.some(m => m.version === manifest.version)) {
              existingVersions.push(manifest)
            }
          }
        } catch (me) {
          console.warn(`[TTYAN] Failed to fetch manifest for ${folderPath}:`, me)
        }
      }
      repo.status = 'online'
      if (!window.ttyan_repoModules) window.ttyan_repoModules = {}
      Object.assign(window.ttyan_repoModules, availableModules)
    } catch (e) {
      repo.status = 'offline'
      console.warn(`[TTYAN] Failed to fetch repo ${repo.url}:`, e)
    }
  }

  const merged = []
  const vMap = {}
  for (const [id, versions] of mergedMap.entries()) {
    versions.sort((a, b) => b.version.localeCompare(a.version))
    vMap[id] = versions
    selectedVersions.value[id] = versions[0].version
    merged.push(versions[0])
  }

  saveRepos()
  pluginVersions.value = vMap
  availablePlugins.value = merged
  isLoading.value = false
  if (merged.length === 0 && repositories.value.length > 0) {
    fetchError.value = 'No plugins found. Check that your repository URLs are correct.'
  }
}

const syncModules = async () => {
  try {
    const res = await fetch('/api/modules')
    if (res.ok) {
      installedModules.value = await res.json()
    }
  } catch (e) {
    console.error('[TTYAN] Failed to sync modules:', e)
  }
}

const installModule = async (moduleId) => {
  isActionLoading.value = true
  try {
    const res = await fetch('/api/modules/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: moduleId })
    })
    if (res.ok) {
      await syncModules()
    } else {
      alert('Module installation failed')
    }
  } catch (e) {
    alert(`Error: ${e.message}`)
  } finally {
    isActionLoading.value = false
  }
}

const filteredPlugins = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return availablePlugins.value.map(p => pluginVersions.value[p.id]?.find(v => v.version === selectedVersions.value[p.id]) || p)
  return availablePlugins.value.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.description?.toLowerCase().includes(q) ||
    p.author?.toLowerCase().includes(q)
  ).map(p => pluginVersions.value[p.id]?.find(v => v.version === selectedVersions.value[p.id]) || p)
})

// ── Installed plugins ──────────────────────────────────────────────────────────

const isInstalled = (id) => props.installedPlugins.some(p => p.id === id)
const getLatestVersion = (id) => availablePlugins.value.find(p => p.id === id)?.version ?? null
const hasUpdate = (plugin) => {
  const latest = getLatestVersion(plugin.id)
  return latest && latest !== plugin.version
}

const openDetails = (plugin) => {
  selectedPlugin.value = plugin
  // Set the initial active version to the current installed version or the latest available
  const installed = props.installedPlugins.find(p => p.id === plugin.id)
  activeVersion.value = installed || plugin
  expandedHistory.value = null // Closed by default
}

const selectVersion = (v) => {
  activeVersion.value = v
  expandedHistory.value = expandedHistory.value === v.version ? null : v.version
}

const toggleHistory = (version) => {
  expandedHistory.value = expandedHistory.value === version ? null : version
}

const getPluginVersions = (id) => {
  return pluginVersions.value[id] || []
}

const matchPattern = (value, pattern) => {
  if (!pattern || !value) return false
  const regexStr = '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'
  const regex = new RegExp(regexStr)
  return regex.test(value)
}

const getBestTier = (value, configObj, defaultTier = 'high') => {
  const matches = []
  // Normalize value for matching (convert github.com to raw.githubusercontent)
  const normalizedValue = value ? toRawUrl(value) : value

  // Iterate over tiers (low, medium, high)
  ;['low', 'medium', 'high'].forEach(tier => {
    const patterns = configObj[tier] || []
    patterns.forEach(p => {
      const patternStr = typeof p === 'string' ? p : p.pattern
      const normalizedPattern = toRawUrl(patternStr)
      
      if (matchPattern(normalizedValue, normalizedPattern)) {
        matches.push({ tier, pattern: patternStr, reason: p.reason })
      }
    })
  })
  
  if (matches.length === 0) {
    return { 
      tier: defaultTier, 
      label: value, 
      reason: configObj.reasons?.[defaultTier] || 'Untrusted or unverified item' 
    }
  }
  
  // Sort by specificity: longest pattern first
  matches.sort((a, b) => b.pattern.length - a.pattern.length)
  const best = matches[0]
  return { 
    tier: best.tier, 
    label: value, 
    reason: best.reason || configObj.reasons?.[best.tier] || '' 
  }
}

const serverInstall = async (plugin) => {
  confirmingPlugin.value = plugin
  const categorization = { low: [], medium: [], high: [] }
  
  // 1. Check Repository Tier (Now using registryUrl)
  const repoResult = getBestTier(plugin.registryUrl, securityRepos)
  categorization[repoResult.tier].push({ 
    label: `Source: ${repoResult.label}`,
    reason: repoResult.reason
  })

  // 2. Check System Permissions
  if (plugin.permissions && Array.isArray(plugin.permissions)) {
    plugin.permissions.forEach(perm => {
      const result = getBestTier(perm, securityPermissions)
      categorization[result.tier].push({ 
        label: perm,
        reason: result.reason
      })
    })
  }

  // 3. Check Domain Permissions
  if (plugin.domains && Array.isArray(plugin.domains)) {
    plugin.domains.forEach(domain => {
      const result = getBestTier(domain, securityDomains)
      categorization[result.tier].push({ 
        label: `Network: ${domain}`,
        reason: result.reason
      })
    })
  }
  
  tierCategorized.value = categorization
}

const fastInstall = (plugin) => {
  serverInstall(plugin)
}

const confirmServerInstall = async () => {
  if (!confirmingPlugin.value) return
  
  isActionLoading.value = true
  try {
    const res = await fetch('/api/plugins/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: confirmingPlugin.value.id,
        basePath: confirmingPlugin.value.basePath
      })
    })
    
    if (res.ok) {
      emit('plugins-updated')
      confirmingPlugin.value = null
    } else {
      const err = await res.json()
      alert(`Installation failed: ${err.detail}`)
    }
  } catch (e) {
    alert(`Error connecting to server: ${e.message}`)
  } finally {
    isActionLoading.value = false
  }
}

const serverUninstall = async (id) => {
  if (!confirm('Are you sure you want to uninstall this plugin?')) return
  
  isActionLoading.value = true
  try {
    const res = await fetch(`/api/plugins/${id}`, {
      method: 'DELETE'
    })
    
    if (res.ok) {
      emit('plugins-updated')
      selectedPlugin.value = null
    } else {
      alert('Uninstallation failed')
    }
  } catch (e) {
    alert(`Error: ${e.message}`)
  } finally {
    isActionLoading.value = false
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

const handleEsc = (e) => {
  if (e.key === 'Escape') {
    selectedPlugin.value = null
    confirmingPlugin.value = null
  }
}

onMounted(() => {
  fetchAllRepos()
  syncModules()
  window.addEventListener('keydown', handleEsc)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleEsc)
})
</script>

<style scoped>
.catalogue-view {
  padding: 24px;
  max-width: 1000px;
  margin: 0 auto;
}

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

.search-bar,
.actions-bar {
  margin-bottom: 20px;
}

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
  cursor: pointer;
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

.permission-tier {
  border-radius: var(--radius-md);
  margin-bottom: 12px;
  border: 1px solid transparent;
  overflow: hidden;
}

.tier-header {
  padding: 10px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.tier-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.tier-header h4 {
  margin: 0;
  font-size: 0.95rem;
}

.tier-header svg {
  transition: transform 0.2s;
}

.tier-header svg.rotated {
  transform: rotate(180deg);
}

.tier-content {
  padding: 8px 16px;
  margin: 0;
  list-style: none;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.perm-info {
  padding: 4px 0;
  cursor: help;
}

.perm-label {
  font-weight: 500;
  font-size: 0.88rem;
  color: var(--text-secondary);
}

.low-tier { background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.15); }
.medium-tier { background: rgba(245, 158, 11, 0.08); border-color: rgba(245, 158, 11, 0.15); }
.high-tier { background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.15); }

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
.low-tier { background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2); }
.medium-tier { background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.2); }
.high-tier { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); }

.perm-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 8px;
}

.perm-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.perm-reason {
  font-size: 0.8rem;
  color: var(--text-secondary);
  opacity: 0.8;
}

.btn-danger    { background-color: transparent; color: #ef4444; border: 1px solid #ef4444; }
.btn-danger:hover  { background-color: rgba(239,68,68,.12); }
.btn-outline   { background-color: transparent; border: 1px solid var(--border-color); color: var(--text-primary); }
.btn-outline:hover { background-color: var(--bg-secondary); }
.btn-icon      { width: 32px; height: 32px; padding: 0; justify-content: center; }

.import-btn { cursor: pointer; }

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

/* ── Details Modal ── */
.detail-modal {
  max-width: 960px;
  width: 90%;
  max-height: 85vh;
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-secondary) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: 1px solid var(--border-color);
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 2rem;
  line-height: 1;
  cursor: pointer;
  z-index: 10;
}

.detail-container {
  display: grid;
  grid-template-columns: 1fr 320px;
  height: 100%;
}

.detail-main {
  padding: 40px;
  overflow-y: auto;
}

.detail-header h1 {
  margin: 0 0 16px 0;
  font-size: 2rem;
  color: var(--text-primary);
}

.detail-description {
  color: var(--text-secondary);
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 24px;
}

.source-info {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 40px;
}

.revision-history h3 {
  margin-bottom: 20px;
  color: var(--text-primary);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  padding: 14px 20px;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.history-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-secondary);
  font-size: 0.95rem;
  width: 100%;
}

.history-v {
  flex-grow: 1;
}

.history-arrow {
  margin-left: auto;
  display: flex;
  align-items: center;
}

.history-row svg {
  transition: transform var(--transition-normal);
}

.history-row svg.rotated {
  transform: rotate(180deg);
}

.history-changes {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.5;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.detail-sidebar {
  background-color: rgba(255, 255, 255, 0.03);
  border-left: 1px solid var(--border-color);
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
}

.detail-banner {
  aspect-ratio: 16/10;
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.detail-banner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.banner-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
  color: white;
  font-weight: bold;
}

.detail-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn-block {
  width: 100%;
  justify-content: center;
  padding: 12px;
}

.info-table {
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.875rem;
}

.info-row:last-child { border-bottom: none; }

.info-label { color: var(--text-muted); }
.info-value { font-weight: 500; text-align: right; }

.text-success { color: #10b981; }
.text-accent { color: var(--accent-color); }

.mini-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 8px;
}

.status-label, .badge {
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.status-label.installed { 
  background: var(--accent-light); 
  color: var(--accent-color); 
  border: 1px solid var(--accent-active);
}

.badge {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-light);
}

.status-label.available { background: var(--bg-tertiary); color: var(--text-secondary); }

.confirmation-modal {
  max-width: 500px;
  max-height: 85vh;
  overflow-y: auto;
}

.modal-content-inner {
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-hint {
  color: var(--text-secondary);
  font-size: 0.95rem;
}

/* Modules Requirement Section */
.modules-requirement {
  padding: 16px;
  background: rgba(59, 130, 246, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--accent-color);
}

.section-title h4 {
  margin: 0;
  font-size: 0.95rem;
}

.modules-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.module-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
}

.module-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.module-id {
  font-family: monospace;
  font-size: 0.85rem;
  font-weight: 600;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-dot.installed { background: #10b981; box-shadow: 0 0 8px #10b981; }
.status-dot.missing { background: #ef4444; }

.status-text {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.check-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 10px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>