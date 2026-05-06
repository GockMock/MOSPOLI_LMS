<template>
  <main class="placeholder-page">
    <section class="placeholder-card">
      <p class="eyebrow">MOSPOLI LMS</p>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
      <button type="button" @click="handleLogout">Выйти</button>
    </section>
  </main>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

defineProps<{
  title: string
  description: string
}>()

const router = useRouter()
const { logout } = useAuth()

const handleLogout = () => {
  logout()
  router.push('/')
}
</script>

<style scoped>
.placeholder-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 96px 20px 32px;
  background: linear-gradient(135deg, var(--md-sys-color-primary-container) 0%, var(--md-sys-color-surface) 100%);
}

.placeholder-card {
  width: min(680px, 100%);
  padding: 40px;
  border-radius: 28px;
  background: var(--md-sys-color-surface);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--md-sys-color-primary);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0 0 12px;
  color: var(--md-sys-color-on-surface);
  font-size: 32px;
  font-weight: 500;
}

p {
  color: var(--md-sys-color-on-surface-variant);
}

button {
  border: 0;
  border-radius: 999px;
  padding: 12px 20px;
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  cursor: pointer;
  font: inherit;
  font-weight: 500;
}

button:hover {
  box-shadow: 0 4px 16px rgba(103, 80, 164, 0.24);
}

a {
  color: var(--md-sys-color-primary);
  font-weight: 500;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
</style>
