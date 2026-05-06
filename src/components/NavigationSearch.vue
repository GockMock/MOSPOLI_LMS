<template>
  <div class="navigation-search" :class="{ 'is-open': isPanelVisible }">
    <form class="search-box" @submit.prevent="submitSearch">
      <span class="search-icon">⌕</span>
      <input
        v-model="query"
        class="search-input"
        type="search"
        autocomplete="off"
        placeholder="Найти раздел LMS..."
        @keydown.down.prevent="moveSelection(1)"
        @keydown.up.prevent="moveSelection(-1)"
        @keydown.enter.prevent="submitSearch"
        @keydown.esc="clearSearch"
      />
      <span v-if="isLoading" class="loader" aria-label="Поиск"></span>
    </form>

    <Transition name="suggestions">
      <div v-if="isPanelVisible" class="suggestions-panel">
        <button
          v-for="(suggestion, index) in suggestions"
          :key="suggestion.id"
          class="suggestion-item"
          :class="{ active: index === activeIndex }"
          type="button"
          @click="goTo(suggestion.url)"
          @mouseenter="activeIndex = index"
        >
          <span>
            <strong>{{ suggestion.title }}</strong>
            <small>{{ suggestion.url }}</small>
          </span>
          <span class="score">{{ Math.round(suggestion.score * 100) }}%</span>
        </button>

        <p v-if="message" class="search-message">{{ message }}</p>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

type SearchSuggestion = {
  id: string
  title: string
  url: string
  score: number
}

type SearchResponse =
  | { action: 'redirect'; query: string; target: SearchSuggestion }
  | { action: 'suggest'; query: string; suggestions: SearchSuggestion[] }
  | { action: 'fallback'; query: string; message: string }

const router = useRouter()
const apiBaseUrl = import.meta.env.VITE_AI_NAVIGATION_URL || ''

const query = ref('')
const suggestions = ref<SearchSuggestion[]>([])
const message = ref('')
const isLoading = ref(false)
const activeIndex = ref(0)
let debounceTimer: ReturnType<typeof setTimeout> | undefined
let requestId = 0

const isPanelVisible = computed(() => suggestions.value.length > 0 || message.value.length > 0)

watch(query, (value) => {
  window.clearTimeout(debounceTimer)

  if (!value.trim()) {
    clearResults()
    return
  }

  debounceTimer = window.setTimeout(() => {
    void runSearch(value)
  }, 320)
})

async function runSearch(value: string) {
  const currentRequestId = ++requestId
  isLoading.value = true
  message.value = ''

  try {
    const response = await fetch(`${apiBaseUrl}/api/navigation-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: value,
        locale: 'ru',
        user_context: {
          current_route: router.currentRoute.value.path,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`AI search failed with ${response.status}`)
    }

    const result = (await response.json()) as SearchResponse

    if (currentRequestId !== requestId) {
      return
    }

    if (result.action === 'redirect') {
      clearResults()
      await router.push(result.target.url)
      return
    }

    if (result.action === 'suggest') {
      suggestions.value = result.suggestions
      activeIndex.value = 0
      message.value = ''
      return
    }

    suggestions.value = []
    message.value = result.message
  } catch {
    suggestions.value = []
    message.value = 'AI-поиск временно недоступен. Попробуйте позже.'
  } finally {
    if (currentRequestId === requestId) {
      isLoading.value = false
    }
  }
}

async function submitSearch() {
  const selectedSuggestion = suggestions.value[activeIndex.value]
  if (selectedSuggestion) {
    await goTo(selectedSuggestion.url)
    return
  }

  if (query.value.trim()) {
    await runSearch(query.value)
  }
}

function moveSelection(direction: number) {
  if (suggestions.value.length === 0) return
  activeIndex.value = (activeIndex.value + direction + suggestions.value.length) % suggestions.value.length
}

async function goTo(url: string) {
  clearSearch()
  await router.push(url)
}

function clearSearch() {
  query.value = ''
  clearResults()
}

function clearResults() {
  suggestions.value = []
  message.value = ''
  activeIndex.value = 0
}
</script>

<style scoped>
.navigation-search {
  position: fixed;
  top: 18px;
  left: 50%;
  z-index: 20;
  width: min(520px, calc(100vw - 32px));
  transform: translateX(-50%);
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 16px;
  border: 1px solid color-mix(in srgb, var(--md-sys-color-outline) 45%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--md-sys-color-surface) 92%, transparent);
  box-shadow: 0 12px 40px rgba(29, 27, 32, 0.14);
  backdrop-filter: blur(18px);
}

.search-icon {
  color: var(--md-sys-color-primary);
  font-size: 22px;
  line-height: 1;
}

.search-input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--md-sys-color-on-surface);
  font: inherit;
  font-size: 15px;
}

.search-input::placeholder {
  color: var(--md-sys-color-on-surface-variant);
}

.loader {
  width: 18px;
  height: 18px;
  border: 2px solid color-mix(in srgb, var(--md-sys-color-primary) 25%, transparent);
  border-top-color: var(--md-sys-color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.suggestions-panel {
  margin-top: 10px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--md-sys-color-outline) 30%, transparent);
  border-radius: 24px;
  background: var(--md-sys-color-surface);
  box-shadow: 0 18px 50px rgba(29, 27, 32, 0.18);
}

.suggestion-item {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--md-sys-color-outline) 16%, transparent);
  background: transparent;
  color: var(--md-sys-color-on-surface);
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.suggestion-item:last-child {
  border-bottom: 0;
}

.suggestion-item:hover,
.suggestion-item.active {
  background: var(--md-sys-color-primary-container);
}

.suggestion-item strong,
.suggestion-item small {
  display: block;
}

.suggestion-item small,
.score,
.search-message {
  color: var(--md-sys-color-on-surface-variant);
  font-size: 12px;
}

.score {
  white-space: nowrap;
}

.search-message {
  margin: 0;
  padding: 16px;
}

.suggestions-enter-active,
.suggestions-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.suggestions-enter-from,
.suggestions-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .navigation-search {
    top: 10px;
  }
}
</style>
