<template>
  <div v-if="installedPlugins.length > 0">
    <div v-if="gridMode === 'all'" class="plugin-grid">
      <div class="plugin-card" v-for="plugin in installedPlugins" :key="plugin.id" @click="$emit('open-plugin', plugin)">
        <div class="plugin-icon-wrapper" :class="plugin.image ? 'has-image' : (plugin.color || 'blue-gradient')">
          <img v-if="plugin.image" :src="plugin.image" :alt="plugin.name" class="plugin-image" />
          <svg v-else class="plugin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2v20"></path>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        </div>
        <h3 class="plugin-title">{{ plugin.name }}</h3>
      </div>
    </div>

    <div v-else class="folder-view">
      <div class="folder-section" v-for="(plugins, folder) in groupedPlugins" :key="folder">
        <h2 class="folder-title">{{ folder }}</h2>
        <div class="plugin-grid folder-grid">
          <div class="plugin-card" v-for="plugin in plugins" :key="plugin.id" @click="$emit('open-plugin', plugin)">
            <div class="plugin-icon-wrapper" :class="plugin.image ? 'has-image' : (plugin.color || 'blue-gradient')">
              <img v-if="plugin.image" :src="plugin.image" :alt="plugin.name" class="plugin-image" />
              <svg v-else class="plugin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v20"></path>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
            <h3 class="plugin-title">{{ plugin.name }}</h3>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="empty-state">
    <p>No extensions installed.</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  installedPlugins: {
    type: Array,
    default: () => []
  },
  gridMode: {
    type: String,
    default: 'all'
  }
})

defineEmits(['open-plugin'])

const groupedPlugins = computed(() => {
  const groups = {}
  props.installedPlugins.forEach(plugin => {
    let folder = 'Uncategorized'
    if (plugin.path) {
      const parts = plugin.path.split('/')
      folder = parts[0]
    }
    if (!groups[folder]) {
      groups[folder] = []
    }
    groups[folder].push(plugin)
  })
  return groups
})
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 60px;
  color: var(--text-secondary);
  font-size: 1.2rem;
}
.plugin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 32px;
  padding: 32px;
}

.folder-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 32px;
}

.folder-section {
  background-color: var(--bg-tertiary);
  border-radius: var(--radius-xl);
  padding: 24px;
  border: 1px solid var(--border-color);
}

.folder-title {
  margin-bottom: 24px;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 12px;
}

.folder-grid {
  padding: 0;
}

.plugin-card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  cursor: pointer;
  transition: all var(--transition-normal);
  box-shadow: var(--shadow-sm);
}

.plugin-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-md);
  border-color: var(--border-light);
  background-color: var(--bg-tertiary);
}

.plugin-icon-wrapper {
  width: 120px;
  height: 120px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}

.plugin-icon-wrapper::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%);
}

.blue-gradient {
  background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
}

.red-gradient {
  background: linear-gradient(135deg, #7f1d1d 0%, #ef4444 100%);
}

.has-image {
  background: transparent;
  padding: 0;
}

.plugin-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}

.plugin-icon {
  width: 48px;
  height: 48px;
  color: white;
  z-index: 1;
}

.plugin-title {
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: var(--text-primary);
}
</style>
