<template>
  <div class="matches">
    <div class="card">
      <h1 class="page-title">智能匹配</h1>

      <div class="filter-bar">
        <el-input v-model="filters.keyword" placeholder="搜索技能" clearable style="width: 200px">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="filters.category" placeholder="技能类别" clearable style="width: 160px">
          <el-option v-for="cat in categories" :key="cat.id" :label="cat.name" :value="cat.id" />
        </el-select>
        <el-slider v-model="filters.minScore" :min="0" :max="100" :step="10" style="width: 200px" />
        <span class="slider-label">最低契合度: {{ filters.minScore }}%</span>
        <el-button type="primary" @click="loadMatches">
          <el-icon><Refresh /></el-icon>刷新匹配
        </el-button>
      </div>

      <div v-if="matches.length" class="matches-list">
        <div v-for="match in filteredMatches" :key="match.userId" class="match-card">
          <div class="match-header">
            <el-avatar :src="match.user.avatar" :size="64" />
            <div class="match-user-info">
              <div class="match-name-row">
                <span class="match-name">{{ match.user.username }}</span>
                <span class="score-badge" :class="getScoreClass(match.score)">
                  {{ match.score }}% 契合
                </span>
              </div>
              <div class="match-rating">
                <el-rate :model-value="match.user.rating" disabled />
                <span class="rating-text">{{ match.user.rating }}</span>
                <span class="exchange-count">交换 {{ match.user.exchangeCount || 0 }} 次</span>
              </div>
              <div class="match-bio">{{ match.user.bio || '这个人很懒，什么都没写' }}</div>
            </div>
            <div class="match-score-circle" :class="getScoreClass(match.score)">
              <span class="score-number">{{ match.score }}</span>
              <span class="score-label">契合度</span>
            </div>
          </div>

          <div class="match-skills-section">
            <div class="skill-column">
              <h4 class="column-title">📖 你可以学到</h4>
              <div class="skills-tags">
                <span v-for="skill in match.matchedSkills.iCanLearn" :key="skill" class="skill-tag skill-learn">
                  {{ skill }}
                </span>
              </div>
            </div>
            <div class="skill-divider">
              <el-icon><Switch /></el-icon>
            </div>
            <div class="skill-column">
              <h4 class="column-title">🎓 你可以教授</h4>
              <div class="skills-tags">
                <span v-for="skill in match.matchedSkills.iCanTeach" :key="skill" class="skill-tag skill-teach">
                  {{ skill }}
                </span>
              </div>
            </div>
          </div>

          <div class="match-actions">
            <el-button @click="goToProfile(match.userId)">
              <el-icon><User /></el-icon>查看主页
            </el-button>
            <el-button type="primary" @click="goToChat(match.userId)">
              <el-icon><ChatDotRound /></el-icon>开始聊天
            </el-button>
            <el-button type="success" @click="createExchange(match)">
              <el-icon><Handshake /></el-icon>发起交换
            </el-button>
          </div>
        </div>
      </div>

      <el-empty v-else description="暂无匹配，先去发布你的技能吧">
        <template #action>
          <el-button type="primary" @click="$router.push('/publish')">发布技能</el-button>
        </template>
      </el-empty>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { matchAPI, skillAPI, exchangeAPI } from '../api'
import { ElMessage } from 'element-plus'
import { Search, Refresh, User, ChatDotRound, Switch, Handshake } from '@element-plus/icons-vue'

const router = useRouter()
const matches = ref([])
const categories = ref([])
const filters = ref({
  keyword: '',
  category: '',
  minScore: 30
})

const filteredMatches = computed(() => {
  let result = matches.value
  if (filters.value.keyword) {
    const keyword = filters.value.keyword.toLowerCase()
    result = result.filter(m =>
      m.matchedSkills.iCanLearn.some(s => s.toLowerCase().includes(keyword)) ||
      m.matchedSkills.iCanTeach.some(s => s.toLowerCase().includes(keyword)) ||
      m.user.username.toLowerCase().includes(keyword)
    )
  }
  return result
})

onMounted(async () => {
  await loadCategories()
  await loadMatches()
})

async function loadCategories() {
  const res = await skillAPI.getCategories()
  categories.value = res.data
}

async function loadMatches() {
  try {
    const params = { minScore: filters.value.minScore }
    if (filters.value.category) params.category = filters.value.category
    const res = await matchAPI.getMatches(params)
    matches.value = res.data
  } catch (e) {
    ElMessage.error('加载匹配失败')
  }
}

function getScoreClass(score) {
  if (score >= 70) return 'score-high'
  if (score >= 40) return 'score-medium'
  return 'score-low'
}

function goToProfile(userId) {
  router.push(`/profile/${userId}`)
}

function goToChat(userId) {
  router.push(`/chat/${userId}`)
}

async function createExchange(match) {
  try {
    await exchangeAPI.createExchange({
      partnerId: match.userId,
      skills: {
        teach: match.matchedSkills.iCanTeach,
        learn: match.matchedSkills.iCanLearn
      }
    })
    ElMessage.success('交换请求已发送')
  } catch (e) {
    ElMessage.error('发起交换失败')
  }
}
</script>

<style scoped>
.matches {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
  flex-wrap: wrap;
}

.slider-label {
  font-size: 14px;
  color: #666;
}

.matches-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.match-card {
  background: #fafafa;
  border-radius: 16px;
  padding: 24px;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.match-card:hover {
  border-color: #667eea;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.15);
}

.match-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
}

.match-user-info {
  flex: 1;
}

.match-name-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.match-name {
  font-size: 20px;
  font-weight: 700;
  color: #333;
}

.match-rating {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.rating-text {
  font-weight: 600;
  color: #ff9800;
}

.exchange-count {
  color: #999;
  font-size: 13px;
}

.match-bio {
  color: #666;
  font-size: 14px;
}

.match-score-circle {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
}

.score-number {
  font-size: 32px;
  font-weight: 700;
}

.score-label {
  font-size: 12px;
}

.match-skills-section {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  margin-bottom: 20px;
}

.skill-column {
  flex: 1;
}

.column-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.skills-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.skill-divider {
  font-size: 32px;
  color: #667eea;
}

.match-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>
