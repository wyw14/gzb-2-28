<template>
  <div class="home">
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalUsers }}</div>
          <div class="stat-label">活跃用户</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📚</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalSkills }}</div>
          <div class="stat-label">技能总数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🤝</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.completedExchanges }}</div>
          <div class="stat-label">完成交换</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📈</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.successRate }}%</div>
          <div class="stat-label">成功率</div>
        </div>
      </div>
    </div>

    <div class="main-grid">
      <div class="card">
        <h2 class="section-title">🔥 热门技能</h2>
        <div v-if="popularSkills.length">
          <div v-for="(skill, index) in popularSkills" :key="skill.name" class="skill-rank-item">
            <div class="rank-number" :class="`rank-${index + 1}`">{{ index + 1 }}</div>
            <div class="skill-info">
              <span class="skill-name">{{ skill.name }}</span>
              <div class="skill-counts">
                <span class="count-tag teach">可教 {{ skill.teachCount }}</span>
                <span class="count-tag learn">想学 {{ skill.learnCount }}</span>
              </div>
            </div>
            <div class="skill-demand" :class="skill.demand > 0 ? 'high-demand' : 'low-demand'">
              {{ skill.demand > 0 ? '需求大' : '供应足' }}
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无数据" />
      </div>

      <div class="card">
        <h2 class="section-title">🌟 为你推荐</h2>
        <div v-if="recommendedMatches.length">
          <div v-for="match in recommendedMatches.slice(0, 5)" :key="match.userId" class="match-card">
            <el-avatar :src="match.user.avatar" :size="48" />
            <div class="match-info">
              <div class="match-header">
                <span class="match-name">{{ match.user.username }}</span>
                <span class="score-badge" :class="getScoreClass(match.score)">
                  契合度 {{ match.score }}%
                </span>
              </div>
              <div class="match-skills">
                <span class="skill-tag skill-learn">学: {{ match.matchedSkills.iCanLearn.slice(0, 2).join(', ') }}</span>
                <span class="skill-tag skill-teach">教: {{ match.matchedSkills.iCanTeach.slice(0, 2).join(', ') }}</span>
              </div>
            </div>
            <el-button type="primary" size="small" @click="goToChat(match.userId)">聊一聊</el-button>
          </div>
        </div>
        <el-empty v-else description="暂无匹配，先去发布技能吧">
          <template #action>
            <el-button type="primary" @click="$router.push('/publish')">发布技能</el-button>
          </template>
        </el-empty>
      </div>
    </div>

    <div class="card">
      <h2 class="section-title">🔍 发现用户</h2>
      <div class="filter-bar">
        <el-input v-model="filters.keyword" placeholder="搜索技能或用户" style="width: 200px" clearable>
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="filters.category" placeholder="技能类别" clearable style="width: 160px">
          <el-option v-for="cat in categories" :key="cat.id" :label="cat.name" :value="cat.id" />
        </el-select>
        <el-select v-model="filters.minRating" placeholder="最低评分" clearable style="width: 140px">
          <el-option label="4分以上" :value="4" />
          <el-option label="3分以上" :value="3" />
          <el-option label="2分以上" :value="2" />
        </el-select>
        <el-button type="primary" @click="loadUsers">
          <el-icon><Search /></el-icon>搜索
        </el-button>
      </div>
      <div v-if="users.length" class="users-grid">
        <div v-for="user in users" :key="user.id" class="user-card" @click="goToProfile(user.id)">
          <el-avatar :src="user.avatar" :size="64" />
          <div class="user-name">{{ user.username }}</div>
          <div class="user-rating">
            <el-rate :model-value="user.rating" disabled />
            <span class="rating-text">{{ user.rating }}</span>
          </div>
          <div class="user-stats">
            <span>交换 {{ user.exchangeCount || 0 }} 次</span>
          </div>
          <div class="user-bio">{{ user.bio || '这个人很懒，什么都没写' }}</div>
        </div>
      </div>
      <el-empty v-else description="没有找到符合条件的用户" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { statsAPI, matchAPI, authAPI, skillAPI } from '../api'
import { Search } from '@element-plus/icons-vue'

const router = useRouter()
const stats = ref({ totalUsers: 0, totalSkills: 0, completedExchanges: 0, successRate: 0 })
const popularSkills = ref([])
const recommendedMatches = ref([])
const users = ref([])
const categories = ref([])
const filters = ref({ keyword: '', category: '', minRating: '' })

onMounted(async () => {
  await loadStats()
  await loadPopularSkills()
  await loadMatches()
  await loadCategories()
  await loadUsers()
})

async function loadStats() {
  const res = await statsAPI.getSuccessRate()
  stats.value = res.data
}

async function loadPopularSkills() {
  const res = await statsAPI.getPopularSkills()
  popularSkills.value = res.data.slice(0, 10)
}

async function loadMatches() {
  try {
    const res = await matchAPI.getMatches()
    recommendedMatches.value = res.data
  } catch (e) {}
}

async function loadCategories() {
  const res = await skillAPI.getCategories()
  categories.value = res.data
}

async function loadUsers() {
  const params = {}
  if (filters.value.minRating) params.minRating = filters.value.minRating
  if (filters.value.keyword) params.skill = filters.value.keyword
  const res = await authAPI.getUsers(params)
  users.value = res.data.slice(0, 8)
}

function getScoreClass(score) {
  if (score >= 70) return 'score-high'
  if (score >= 40) return 'score-medium'
  return 'score-low'
}

function goToChat(userId) {
  router.push(`/chat/${userId}`)
}

function goToProfile(userId) {
  router.push(`/profile/${userId}`)
}
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  font-size: 48px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #333;
}

.stat-label {
  font-size: 14px;
  color: #999;
}

.main-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.skill-rank-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}

.rank-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  background: #f0f0f0;
  color: #666;
}

.rank-1 {
  background: linear-gradient(135deg, #ffd700, #ffb700);
  color: white;
}

.rank-2 {
  background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
  color: white;
}

.rank-3 {
  background: linear-gradient(135deg, #cd7f32, #b87333);
  color: white;
}

.skill-info {
  flex: 1;
}

.skill-name {
  font-weight: 600;
  color: #333;
}

.count-tag {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  margin-right: 8px;
}

.count-tag.teach {
  background: #e8f5e9;
  color: #2e7d32;
}

.count-tag.learn {
  background: #fff3e0;
  color: #ef6c00;
}

.skill-demand {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.high-demand {
  background: #ffebee;
  color: #c62828;
}

.low-demand {
  background: #e8f5e9;
  color: #2e7d32;
}

.match-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid #eee;
}

.match-info {
  flex: 1;
}

.match-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.match-name {
  font-weight: 600;
  color: #333;
}

.match-skills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.users-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.user-card {
  background: #fafafa;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.user-card:hover {
  border-color: #667eea;
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.2);
}

.user-name {
  font-weight: 600;
  color: #333;
  margin: 12px 0 8px;
}

.user-rating {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
}

.rating-text {
  font-weight: 600;
  color: #ff9800;
}

.user-stats {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.user-bio {
  font-size: 12px;
  color: #999;
  line-height: 1.5;
}

@media (max-width: 1024px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .main-grid {
    grid-template-columns: 1fr;
  }
  .users-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
