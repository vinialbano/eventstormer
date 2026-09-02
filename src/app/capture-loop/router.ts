import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import CaptureScreen from './shell/CaptureScreen.vue'
import CreateWorkshop from './shell/CreateWorkshop.vue'

/**
 * Two routes, declared by hand — there is no filesystem routing anywhere in
 * this project (AGENTS.md). `/` creates a workshop; `/workshops/:id` is the
 * resumable capture screen whose id is the nanoid slug from `POST /workshops`.
 */
const routes: RouteRecordRaw[] = [
  { path: '/', name: 'create', component: CreateWorkshop },
  { path: '/workshops/:id', name: 'capture', component: CaptureScreen, props: true },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
