<template>
  <div class="rankings">
    <div class="card">
      <h1 class="page-title">排行榜与统计</h1>

      <div class="stats-overview">
        <div class="stat-card big">
          <div class="stat-icon">📊</div>
          <div>
            <div class="stat-value">{{ stats.successRate }}%</div>
            <div class="stat-label">交换成功率</div>
          </div>
        </div>
        <div class="stat-card big">
          <div class="stat-icon">🤝</div>
          <div>
            <div class="stat-value">{{ stats.completedExchanges }}</div>
            <div class="stat-label">已完成交换</div>
          </div>
        </div>
        <div class="stat-card big">
          <div class="stat-icon">👥</div>
          <div>
            <div class="stat-value">{{ stats.totalUsers }}</div>
            <div class="stat-label">活跃用户</div>
          </div>
        </div>
        <div class="stat-card big">
          <div class="stat-icon">📚</div>
          <div>
            <div class="stat-value">{{ stats.totalSkills }}</div>
            <div class="stat-label">技能总数</div>
          </div>
        </div>
      </div>

      <div class="ranking-tabs">
        <div class="tab" :class="{ active: activeTab === 'skills' }" @click="activeTab = 'skills'">
          🔥 热门技能
        </div>
        <div class="tab" :class="{ active: activeTab === 'demand' }" @click="activeTab = 'demand'">
          📈 需求排行
        </div>
        <div class="tab" :class="{ active: activeTab === 'users' }" @click="activeTab = 'users'">
          ⭐ 用户排行
        </div>
      </div>

      <div v-if="activeTab === 'skills'" class="ranking-content">
        <div ref="skillChartRef" style="height: 400px"></div>
        <div class="ranking-list">
          <div v-for="(skill, index) in popularSkills" :key="skill.name" class="ranking-item">
            <div class="rank-num" :class="`rank-${index + 1}`">{{ index + 1 }}</div>
            <div class="rank-info">
              <span class="rank-name">{{ skill.name }}</span>
              <div class="rank-bars">
                <div class="bar-item">
                  <span class="bar-label">可教</span>
                  <div class="bar-track">
                    <div class="bar-fill teach" :style="{ width: getBarWidth(skill.teachCount) }"></div>
                  </div>
                  <span class="bar-value">{{ skill.teachCount }}</span>
                </div>
                <div class="bar-item">
                  <span class="bar-label">想学</span>
                  <div class="bar-track">
                    <div class="bar-fill learn" :style="{ width: getBarWidth(skill.learnCount) }"></div>
                  </div>
                  <span class="bar-value">{{ skill.learnCount }}</span>
                </div>
              </div>
            </div>
            <div class="rank-total">{{ skill.total }} 人</div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'demand'" class="ranking-content">
        <div ref="demandChartRef" style="height: 400px"></div>
        <div class="ranking-list">
          <div v-for="(skill, index) in demandSkills" :key="skill.name" class="ranking-item">
            <div class="rank-num" :class="`rank-${index + 1}`">{{ index + 1 }}</div>
            <div class="rank-info">
              <span class="rank-name">{{ skill.name }}</span>
              <div class="demand-info">
                <span class="demand-tag" :class="skill.demand > 0 ? 'high' : 'low'">
                  {{ skill.demand > 0 ? `缺口 ${skill.demand} 人` : `过剩 ${Math.abs(skill.demand)} 人` }}
                </span>
              </div>
            </div>
            <div class="demand-ratio">
              {{ skill.learnCount }} / {{ skill.teachCount }}
              <small>学/教</small>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'users'" class="ranking-content">
        <div class="users-grid">
          <div v-for="(user, index) in topUsers" :key="user.id" class="user-rank-card" @click="goToProfile(user.id)">
            <div class="user-rank-num" :class="`rank-${index + 1}`">{{ index + 1 }}</div>
            <el-avatar :src="user.avatar" :size="64" />
            <div class="user-rank-name">{{ user.username }}</div>
            <div class="user-rank-rating">
              <el-rate :model-value="user.rating" disabled size="small" />
              <span>{{ user.rating }}</span>
            </div>
            <div class="user-rank-stats">
              <div class="stat">
                <span class="num">{{ user.exchangeCount || 0 }}</span>
                <span class="label">交换</span>
              </div>
              <div class="stat">
                <span class="num">{{ user.skillPoints || 0 }}</span>
                <span class="label">技能点</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { statsAPI, authAPI } from '../api'
import * as echarts from 'echarts'

const router = useRouter()
const activeTab = ref('skills')
const stats = ref({ totalUsers: 0, totalSkills: 0, completedExchanges: 0, successRate: 0 })
const popularSkills = ref([])
const topUsers = ref([])
const skillChartRef = ref(null)
const demandChartRef = ref(null)
let skillChart = null
let demandChart = null

const demandSkills = computed(() =>
  [...popularSkills.value].sort((a, b) => b.demand - a.demand)
)

const maxCount = computed(() =>
  Math.max(...popularSkills.value.map(s => Math.max(s.teachCount, s.learnCount)), 1)
)

onMounted(async () => {
  await loadStats()
  await loadPopularSkills()
  await loadTopUsers()
})

watch(activeTab, (newTab) => {
  if (newTab === 'skills') {
    setTimeout(() => initSkillChart(), 100)
  } else if (newTab === 'demand') {
    setTimeout(() => initDemandChart(), 100)
  }
})

async function loadStats() {
  const res = await statsAPI.getSuccessRate()
  stats.value = res.data
}

async function loadPopularSkills() {
  const res = await statsAPI.getPopularSkills()
  popularSkills.value = res.data.slice(0, 15)
  setTimeout(() => initSkillChart(), 100)
}

async function loadTopUsers() {
  const res = await authAPI.getUsers({})
  topUsers.value = res.data
    .sort((a, b) => (b.rating * 100 + b.exchangeCount) - (a.rating * 100 + a.exchangeCount))
    .slice(0, 10)
}

function getBarWidth(count) {
  return `${(count / maxCount.value) * 100}%`
}

function initSkillChart() {
  if (!skillChartRef.value) return
  if (skillChart) skillChart.dispose()
  skillChart = echarts.init(skillChartRef.value)

  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['可教人数', '想学人数'] },
    xAxis: { type: 'category', data: popularSkills.value.slice(0, 10).map(s => s.name) },
    yAxis: { type: 'value' },
    series: [
      {
        name: '可教人数',
        type: 'bar',
        data: popularSkills.value.slice(0, 10).map(s => s.teachCount),
        itemStyle: { color: '#67c23a' }
      },
      {
        name: '想学人数',
        type: 'bar',
        data: popularSkills.value.slice(0, 10).map(s => s.learnCount),
        itemStyle: { color: '#e6a23c' }
      }
    ]
  }
  skillChart.setOption(option)
}

function initDemandChart() {
  if (!demandChartRef.value) return
  if (demandChart) demandChart.dispose()
  demandChart = echarts.init(demandChartRef.value)

  const topDemand = demandSkills.value.slice(0, 10)
  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['需求缺口'] },
    xAxis: { type: 'category', data: topDemand.map(s => s.name) },
    yAxis: { type: 'value', name: '需求缺口（想学-可教）' },
    series: [{
      name: '需求缺口',
      type: 'bar',
      data: topDemand.map(s => s.demand),
      itemStyle: {
        color: params => params.data >= 0 ? '#f56c6c' : '#67c23a'
      }
    }]
  }
  demandChart.setOption(option)
}

function goToProfile(userId) {
  router.push(`/profile/${userId}`)
}
</script>

<style scoped>
.rankings {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card.big {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: linear-gradient(135deg, #667eea10 0%, #764ba210 100%);
  border-radius: 12px;
}

.stat-card.big .stat-icon {
  font-size: 48px;
}

.stat-card.big .stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #333;
}

.stat-card.big .stat-label {
  color: #666;
  font-size: 14px;
}

.ranking-tabs {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  border-bottom: 2px solid #eee;
}

.tab {
  padding: 12px 24px;
  cursor: pointer;
  font-weight: 500;
  color: #999;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s;
}

.tab.active {
  color: #667eea;
  border-bottom-color: #667eea;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 24px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: #fafafa;
  border-radius: 12px;
  transition: all 0.2s;
}

.ranking-item:hover {
  background: #f0f2ff;
}

.rank-num {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 18px;
  background: #f0f0f0;
  color: #666;
  flex-shrink: 0;
}

.rank-1 { background: linear-gradient(135deg, #ffd700, #ffb700); color: white; }
.rank-2 { background: linear-gradient(135deg, #c0c0c0, #a0a0a0); color: white; }
.rank-3 { background: linear-gradient(135deg, #cd7f32, #b87333); color: white; }

.rank-info {
  flex: 1;
}

.rank-name {
  font-weight: 600;
  font-size: 16px;
  color: #333;
  display: block;
  margin-bottom: 12px;
}

.rank-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bar-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bar-label {
  width: 40px;
  font-size: 12px;
  color: #666;
}

.bar-track {
  flex: 1;
  height: 8px;
  background: #eee;
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s;
}

.bar-fill.teach { background: linear-gradient(90deg, #67c23a, #85ce61); }
.bar-fill.learn { background: linear-gradient(90deg, #e6a23c, #f0c78a); }

.bar-value {
  width: 40px;
  text-align: right;
  font-size: 12px;
  font-weight: 600;
  color: #333;
}

.rank-total {
  font-size: 24px;
  font-weight: 700;
  color: #667eea;
}

.demand-tag {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.demand-tag.high { background: #fef0f0; color: #f56c6c; }
.demand-tag.low { background: #f0f9ff; color: #67c23a; }

.demand-ratio {
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  color: #333;
}

.demand-ratio small {
  display: block;
  font-size: 12px;
  color: #999;
  font-weight: normal;
}

.users-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}

.user-rank-card {
  position: relative;
  background: #fafafa;
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.user-rank-card:hover {
  border-color: #667eea;
  transform: translateY(-4px);
}

.user-rank-num {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  background: #f0f0f0;
  color: #666;
}

.user-rank-name {
  font-weight: 600;
  color: #333;
  margin: 12px 0 8px;
}

.user-rank-rating {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
  color: #ff9800;
  font-weight: 600;
}

.user-rank-stats {
  display: flex;
  justify-content: space-around;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.user-rank-stats .stat {
  display: flex;
  flex-direction: column;
}

.user-rank-stats .num {
  font-size: 18px;
  font-weight: 700;
  color: #667eea;
}

.user-rank-stats .label {
  font-size: 12px;
  color: #999;
}

@media (max-width: 1024px) {
  .stats-overview { grid-template-columns: repeat(2, 1fr); }
  .users-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
