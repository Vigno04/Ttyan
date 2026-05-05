<template>
  <div v-if="!isAuthenticated">
    <Auth @authenticated="handleLogin" />
  </div>

  <div class="app-layout" v-else>
    <Header @toggle-sidebar="toggleSidebar" @open-catalogue="currentView = 'catalogue'" @go-home="currentView = 'home'" :user="currentUser" :currentView="currentView" :gridMode="gridMode" @update-grid-mode="gridMode = $event" @logout="handleLogout" />
    
    <div class="main-container">
      <Sidebar :class="{ 'sidebar-hidden': !isSidebarOpen }" :installed-plugins="installedPlugins" @go-home="currentView = 'home'" @open-plugin="openPlugin" />
      
      <main class="content-area">
        <div class="content-wrapper">
          <PluginGrid v-if="currentView === 'home'" :installed-plugins="installedPlugins" :gridMode="gridMode" @open-plugin="openPlugin" />
          <Catalogue v-else-if="currentView === 'catalogue'" :user="currentUser" :installed-plugins="installedPlugins" @plugins-updated="syncPlugins" @plugin-installed="handlePluginInstalled" />
          <PluginRunner v-else-if="currentView === 'plugin'" :plugin="activePlugin" :user="currentUser" :uiJson="activeUiJson" />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Header from './components/Header.vue'
import Sidebar from './components/Sidebar.vue'
import PluginGrid from './components/PluginGrid.vue'
import Catalogue from './components/Catalogue.vue'
import Auth from './components/Auth.vue'
import PluginRunner from './components/PluginRunner.vue'

const isAuthenticated = ref(false)
const currentUser = ref(null)

const isSidebarOpen = ref(true)
const currentView = ref('home') // 'home', 'catalogue', 'plugin'
const gridMode = ref('all') // 'all' or 'folder'
const activePlugin = ref(null)
const activeUiJson = ref(null)

const installedPlugins = ref([])

const syncPlugins = () => {
  installedPlugins.value = JSON.parse(localStorage.getItem('ttyan_installed_plugins') || '[]')
}

onMounted(() => {
  syncPlugins()
  window.addEventListener('storage', syncPlugins)
})

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

const handleLogin = (user) => {
  currentUser.value = user
  isAuthenticated.value = true
}

const handleLogout = () => {
  currentUser.value = null
  isAuthenticated.value = false
  currentView.value = 'home'
}

const openPlugin = async (plugin) => {
  activePlugin.value = plugin

  // Use the plugin's own basePath to load its ui.json — works for any plugin regardless of origin
  if (plugin.basePath) {
    try {
      const res = await fetch(`${plugin.basePath}/ui.json`)
      if (res.ok) {
        activeUiJson.value = await res.json()
        currentView.value = 'plugin'
        return
      }
    } catch (e) {
      console.warn(`[TTYAN] Could not load ui.json for ${plugin.id} from ${plugin.basePath}:`, e)
    }
  }

  // If ui.json couldn't be loaded, open with empty layout (plugin may be worker-only)
  activeUiJson.value = { layout: [] }
  currentView.value = 'plugin'
}

const handlePluginInstalled = () => {
  // Can sync state if needed
}
</script>

<style>
/* Base app layout */
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.main-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  background-color: var(--bg-primary);
  transition: all var(--transition-normal);
}

.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.sidebar-hidden {
  margin-left: calc(-1 * var(--sidebar-width));
}
</style>
