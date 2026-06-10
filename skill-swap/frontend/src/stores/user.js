import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authAPI } from '../api'

export const useUserStore = defineStore('user', () => {
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  const token = ref(localStorage.getItem('token') || '')

  async function register(data) {
    const res = await authAPI.register(data)
    user.value = res.data.user
    token.value = res.data.token
    localStorage.setItem('user', JSON.stringify(res.data.user))
    localStorage.setItem('token', res.data.token)
    return res.data
  }

  async function login(data) {
    const res = await authAPI.login(data)
    user.value = res.data.user
    token.value = res.data.token
    localStorage.setItem('user', JSON.stringify(res.data.user))
    localStorage.setItem('token', res.data.token)
    return res.data
  }

  function logout() {
    user.value = null
    token.value = ''
    localStorage.removeItem('user')
    localStorage.removeItem('token')
  }

  async function fetchMe() {
    if (!token.value) return null
    const res = await authAPI.getMe()
    user.value = res.data
    localStorage.setItem('user', JSON.stringify(res.data))
    return res.data
  }

  async function updateProfile(data) {
    const res = await authAPI.updateProfile(data)
    user.value = res.data
    localStorage.setItem('user', JSON.stringify(res.data))
    return res.data
  }

  return { user, token, register, login, logout, fetchMe, updateProfile }
})
