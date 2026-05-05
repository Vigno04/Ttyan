<template>
  <div class="auth-container">
    <div class="auth-card glass">
      <div class="logo">
        <span class="brand">TTYAN</span>
      </div>
      
      <h2>{{ isLogin ? 'Welcome Back' : 'Create Account' }}</h2>
      
      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="form-group">
          <label>Username</label>
          <input type="text" v-model="username" class="input-glass" required />
        </div>
        
        <div class="form-group">
          <label>Password</label>
          <input type="password" v-model="password" class="input-glass" required />
        </div>

        <button type="submit" class="btn btn-primary w-100">
          {{ isLogin ? 'Log In' : 'Register' }}
        </button>
      </form>
      
      <div class="auth-switch">
        <button class="btn btn-text" @click="isLogin = !isLogin">
          {{ isLogin ? "Don't have an account? Register" : "Already have an account? Log in" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['authenticated'])

const isLogin = ref(true)
const username = ref('')
const password = ref('')

const handleSubmit = () => {
  if (username.value && password.value) {
    // Mock user login - 'admin' gets Admin role, others get User role
    const role = username.value.toLowerCase() === 'admin' ? 'Admin' : 'User'
    emit('authenticated', { username: username.value, role: role })
  }
}
</script>

<style scoped>
.auth-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: var(--bg-primary);
}

.auth-card {
  width: 100%;
  max-width: 400px;
  padding: 40px;
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: var(--shadow-glass);
}

.logo {
  margin-bottom: 24px;
}

h2 {
  margin-bottom: 32px;
  color: var(--text-primary);
}

.auth-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

label {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.input-glass {
  width: 100%;
  padding: 12px 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: inherit;
}

.input-glass:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px var(--accent-light);
}

.btn {
  padding: 12px 24px;
  border-radius: var(--radius-md);
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: 1rem;
}

.btn-primary {
  background-color: var(--accent-color);
  color: white;
}

.btn-primary:hover {
  background-color: var(--accent-hover);
}

.btn-text {
  background-color: transparent;
  color: var(--text-secondary);
  padding: 8px;
}

.btn-text:hover {
  color: var(--text-primary);
}

.w-100 {
  width: 100%;
}

.auth-switch {
  margin-top: 24px;
}
</style>