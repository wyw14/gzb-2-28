import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { guest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue'),
    meta: { guest: true }
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/publish',
    name: 'Publish',
    component: () => import('../views/Publish.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/matches',
    name: 'Matches',
    component: () => import('../views/Matches.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('../views/Chat.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/chat/:userId',
    name: 'ChatDetail',
    component: () => import('../views/Chat.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/Profile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile/:userId',
    name: 'UserProfile',
    component: () => import('../views/UserProfile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/skill-tree',
    name: 'SkillTree',
    component: () => import('../views/SkillTree.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/rankings',
    name: 'Rankings',
    component: () => import('../views/Rankings.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/exchanges',
    name: 'Exchanges',
    component: () => import('../views/Exchanges.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  if (to.meta.requiresAuth && !userStore.token) {
    next('/login')
  } else if (to.meta.guest && userStore.token) {
    next('/')
  } else {
    next()
  }
})

export default router
