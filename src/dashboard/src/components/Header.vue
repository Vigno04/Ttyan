<template>
  <header class="header glass">
    <div class="header-left">
      <button class="menu-btn" @click="$emit('toggle-sidebar')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
      <div class="logo" @click="$emit('go-home')" style="cursor: pointer;">
        <span class="brand">TTYAN</span>
      </div>
    </div>
    
    <div class="header-center" v-if="currentView === 'home'">
      <div class="view-toggle glass-pill">
        <button :class="{'active': gridMode === 'all'}" @click="$emit('update-grid-mode', 'all')">All</button>
        <button :class="{'active': gridMode === 'folder'}" @click="$emit('update-grid-mode', 'folder')">Folder</button>
      </div>
    </div>

    <div class="header-right">
      <button class="action-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </button>
      
      <div class="profile-wrapper" ref="profileWrapper">
        <button class="profile-btn" @click="toggleProfileMenu">
          <div class="avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
        </button>
        
        <ProfileMenu v-if="isProfileMenuOpen" :user="user" @close="isProfileMenuOpen = false" @open-catalogue="$emit('open-catalogue'); isProfileMenuOpen = false" @logout="$emit('logout')" />
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import ProfileMenu from './ProfileMenu.vue'

const props = defineProps({
  user: Object,
  currentView: String,
  gridMode: String
})

defineEmits(['toggle-sidebar', 'open-catalogue', 'go-home', 'logout', 'update-grid-mode'])

const isProfileMenuOpen = ref(false)
const profileWrapper = ref(null)

const toggleProfileMenu = () => {
  isProfileMenuOpen.value = !isProfileMenuOpen.value
}

const handleClickOutside = (event) => {
  if (profileWrapper.value && !profileWrapper.value.contains(event.target)) {
    isProfileMenuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-center {
  display: flex;
  justify-content: center;
  flex: 1;
}

.view-toggle {
  display: flex;
  background-color: var(--bg-secondary);
  border-radius: var(--radius-full);
  padding: 4px;
  border: 1px solid var(--border-color);
}

.view-toggle button {
  background: transparent;
  border: none;
  padding: 6px 16px;
  border-radius: var(--radius-full);
  color: var(--text-secondary);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.view-toggle button:hover {
  color: var(--text-primary);
}

.view-toggle button.active {
  background-color: var(--accent-color);
  color: white;
  box-shadow: var(--shadow-sm);
}

.header-left, .header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.menu-btn, .action-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.menu-btn:hover, .action-btn:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.menu-btn svg, .action-btn svg {
  width: 24px;
  height: 24px;
}

.logo {
  display: flex;
  align-items: center;
  margin-left: 8px;
}

.brand {
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--text-primary);
}

.profile-wrapper {
  position: relative;
}

.profile-btn {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  overflow: hidden;
  border: 2px solid var(--border-color);
  transition: all var(--transition-fast);
}

.profile-btn:hover {
  border-color: var(--text-secondary);
}

.avatar {
  width: 100%;
  height: 100%;
  background-color: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.avatar svg {
  width: 20px;
  height: 20px;
}
</style>
