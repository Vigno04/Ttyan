<template>
  <div class="profile-menu glass">
    <div class="user-info">
      <div class="user-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>
      <div class="user-details">
        <span class="user-name">{{ user?.username || 'Guest' }}</span>
        <span class="user-role">{{ user?.role || 'User' }}</span>
      </div>
    </div>
    
    <div class="menu-divider"></div>
    
    <button v-if="user?.role?.toLowerCase() === 'admin'" class="menu-item" @click="$emit('open-catalogue')">
      <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <path d="M2 15h10"></path>
        <path d="M9 18l3-3-3-3"></path>
      </svg>
      Catalogue / Plugins
    </button>
    
    <button class="menu-item">
      <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
      Settings
    </button>
    
    <div class="menu-divider"></div>
    
    <button class="menu-item">
      <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
      Theme (Dark)
    </button>
    
    <button class="menu-item">
      <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
      Italiano
    </button>
    
    <div class="menu-divider"></div>
    
    <button class="menu-item text-danger" @click="$emit('logout')">
      <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>
      Esci
    </button>
  </div>
</template>

<script setup>
defineProps({
  user: Object
})
defineEmits(['close', 'open-catalogue', 'logout'])
</script>

<style scoped>
.profile-menu {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 240px;
  border-radius: var(--radius-lg);
  padding: 8px 0;
  box-shadow: var(--shadow-glass);
  transform-origin: top right;
  animation: slideDown var(--transition-fast);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  background-color: var(--bg-tertiary);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.user-avatar svg {
  width: 18px;
  height: 18px;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.user-role {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.menu-divider {
  height: 1px;
  background-color: var(--border-color);
  margin: 4px 0;
}

.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  font-size: 0.95rem;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
  text-align: left;
}

.menu-item:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.menu-icon {
  width: 18px;
  height: 18px;
}

.text-danger {
  color: #ef4444;
}

.text-danger:hover {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}
</style>
