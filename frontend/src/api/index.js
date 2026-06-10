import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/users/profile', data),
  getUsers: (params) => api.get('/users', { params }),
  getUser: (id) => api.get(`/users/${id}`)
}

export const skillAPI = {
  getSkills: (params) => api.get('/skills', { params }),
  createSkill: (data) => api.post('/skills', data),
  updateSkill: (id, data) => api.put(`/skills/${id}`, data),
  deleteSkill: (id) => api.delete(`/skills/${id}`),
  getCategories: () => api.get('/skill-categories')
}

export const matchAPI = {
  getMatches: (params) => api.get('/matches', { params })
}

export const messageAPI = {
  getConversations: () => api.get('/conversations'),
  getMessages: (userId) => api.get(`/messages/${userId}`),
  sendMessage: (data) => api.post('/messages', data)
}

export const exchangeAPI = {
  getExchanges: () => api.get('/exchanges'),
  createExchange: (data) => api.post('/exchanges', data),
  confirmExchange: (id) => api.put(`/exchanges/${id}/confirm`)
}

export const reviewAPI = {
  createReview: (data) => api.post('/reviews', data),
  getReviews: (userId) => api.get(`/reviews/${userId}`)
}

export const statsAPI = {
  getPopularSkills: () => api.get('/stats/popular-skills'),
  getSuccessRate: () => api.get('/stats/success-rate')
}

export const skillTreeAPI = {
  updateSkillTree: (data) => api.put('/skill-tree', data)
}

export default api
