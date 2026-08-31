<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAccountStore } from '../stores/account.ts'

/**
 * Right-edge readable-account drawer. Markdown is sanitised in the account
 * store; this panel writes that HTML into the body node.
 */
const account = useAccountStore()
const body = ref<HTMLElement | null>(null)

watch([() => account.html, body], () => {
  if (body.value !== null) body.value.innerHTML = account.html
})
</script>

<template>
  <aside class="account" role="region" aria-labelledby="account-title">
    <h2 id="account-title" class="sr-only">Readable account</h2>
    <div ref="body" class="account__body" />
  </aside>
</template>

<style scoped>
.account {
  position: fixed;
  top: 16px;
  right: 16px;
  bottom: 16px;
  z-index: 15;
  width: min(380px, calc(100vw - 32px));
  overflow: auto;
  padding: 20px 22px;
  border-radius: var(--radius-panel);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-panel);
  font-family: var(--font-ui);
  color: var(--color-text);
}
.account__body {
  font-size: 0.9375rem;
  line-height: 1.45;
}
.account__body :deep(h1) {
  margin: 0 0 12px;
  font-size: 1.125rem;
  font-weight: 800;
}
.account__body :deep(h2) {
  margin: 18px 0 8px;
  font-size: 0.9375rem;
  font-weight: 700;
}
.account__body :deep(blockquote) {
  margin: 8px 0;
  padding: 8px 12px;
  border-left: 1px solid var(--color-line);
  background-color: var(--color-surface-sunk);
  color: var(--color-text);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
