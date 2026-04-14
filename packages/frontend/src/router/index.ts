import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '@/components/DashboardView.vue'
import TaskBoard from '@/components/TaskBoard.vue'
import GanttView from '@/components/GanttView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardView },
    { path: '/kanban', name: 'kanban', component: TaskBoard },
    { path: '/gantt', name: 'gantt', component: GanttView },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
