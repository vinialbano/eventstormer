<script setup lang="ts">
import { onMounted, ref } from 'vue'

const health = ref<string>('checking…')

onMounted(async () => {
  try {
    const res = await fetch('/api/health')
    const body = (await res.json()) as { status: string; opSchemaVersion: number }
    health.value = `${body.status} · op schema v${String(body.opSchemaVersion)}`
  } catch {
    health.value = 'unreachable'
  }
})
</script>

<template>
  <main class="min-h-dvh bg-stone-50 text-stone-900 flex items-center justify-center p-8">
    <div class="max-w-prose space-y-3">
      <h1 class="text-2xl font-semibold tracking-tight">EventStormer</h1>
      <p class="text-stone-600">A living domain model built by conversation.</p>
      <p class="text-sm text-stone-500">
        API: <span class="font-mono">{{ health }}</span>
      </p>
    </div>
  </main>
</template>
