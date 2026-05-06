import { computed, ref } from 'vue'

const storageKey = 'mospoli_lms_is_authenticated'
const isAuthenticated = ref(localStorage.getItem(storageKey) === 'true')

export function useAuth() {
  const login = () => {
    localStorage.setItem(storageKey, 'true')
    isAuthenticated.value = true
  }

  const logout = () => {
    localStorage.removeItem(storageKey)
    isAuthenticated.value = false
  }

  return {
    isAuthenticated: computed(() => isAuthenticated.value),
    login,
    logout,
  }
}
