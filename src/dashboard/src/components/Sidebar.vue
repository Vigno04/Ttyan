<template>
  <aside class="sidebar">
    <nav class="nav-menu">
      <!-- Dashboard top-level -->
      <div class="nav-section">
        <button class="nav-item dashboard-item" @click="$emit('go-home')">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span class="label">Dashboard</span>
        </button>

        <div class="tree-container">
          <!-- Folders -->
          <div v-for="(plugins, folder) in groupedPlugins" :key="folder" class="folder-container">
            <div class="folder-header" @click="toggleFolder(folder)">
              <svg 
                class="chevron" 
                :class="{ 'chevron-rotated': openFolders[folder] }" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                stroke-width="2"
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
              <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <span class="folder-label">{{ folder }}</span>
            </div>

            <!-- Plugins in folder -->
            <div v-if="openFolders[folder]" class="plugin-list">
              <button 
                v-for="plugin in plugins" 
                :key="plugin.id" 
                class="plugin-item" 
                @click="$emit('open-plugin', plugin)"
              >
                <div class="tree-line"></div>
                <svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="3"></rect>
                  <path d="M12 8v8M8 12h8"></path>
                </svg>
                <span class="plugin-label">{{ plugin.name }}</span>
              </button>
            </div>
          </div>

          <div v-if="Object.keys(groupedPlugins).length === 0" class="empty-state">
            No plugins installed
          </div>
        </div>
      </div>
    </nav>
  </aside>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  installedPlugins: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['go-home', 'open-plugin'])

const openFolders = ref({})

const toggleFolder = (folder) => {
  openFolders.value[folder] = !openFolders.value[folder]
}

const groupedPlugins = computed(() => {
  const groups = {}
  props.installedPlugins.forEach(plugin => {
    const folder = plugin.path ? plugin.path.split('/')[0] : 'Other'
    if (!groups[folder]) groups[folder] = []
    groups[folder].push(plugin)
  })
  return groups
})

// Initialize open states when plugins are loaded
watch(groupedPlugins, (newGroups) => {
  Object.keys(newGroups).forEach(folder => {
    if (openFolders.value[folder] === undefined) {
      openFolders.value[folder] = true
    }
  })
}, { immediate: true })
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  height: calc(100vh - var(--header-height));
  background-color: var(--bg-primary);
  border-right: 1px solid var(--border-color);
  padding: 16px 0;
  overflow-y: auto;
  flex-shrink: 0;
}

.nav-menu {
  display: flex;
  flex-direction: column;
  padding: 0 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-weight: 600;
  width: 100%;
  text-align: left;
  transition: all var(--transition-fast);
}

.nav-item:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.dashboard-item {
  margin-bottom: 8px;
}

.icon, .icon-sm, .icon-xs {
  flex-shrink: 0;
  color: var(--accent-color);
}

.icon { width: 20px; height: 20px; }
.icon-sm { width: 16px; height: 16px; color: var(--text-secondary); }
.icon-xs { width: 14px; height: 14px; color: var(--text-muted); }

.tree-container {
  margin-left: 8px;
}

.folder-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.folder-header:hover {
  background-color: var(--bg-tertiary);
}

.chevron {
  width: 14px;
  height: 14px;
  color: var(--text-muted);
  transition: transform var(--transition-fast);
}

.chevron-rotated {
  transform: rotate(90deg);
}

.folder-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.plugin-list {
  margin-left: 14px;
  padding-left: 12px;
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 2px;
  margin-bottom: 8px;
}

.plugin-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.9rem;
  width: 100%;
  text-align: left;
  transition: all var(--transition-fast);
  position: relative;
}

.plugin-item:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.empty-state {
  padding: 20px;
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-muted);
  font-style: italic;
}
</style>
