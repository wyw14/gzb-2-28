<template>
  <div class="exchanges">
    <div class="card">
      <h1 class="page-title">交换记录</h1>

      <div class="exchange-tabs">
        <div class="tab" :class="{ active: activeTab === 'pending' }" @click="activeTab = 'pending'">
          待确认 ({{ pendingExchanges.length }})
        </div>
        <div class="tab" :class="{ active: activeTab === 'completed' }" @click="activeTab = 'completed'">
          已完成 ({{ completedExchanges.length }})
        </div>
      </div>

      <div v-if="activeTab === 'pending'" class="exchange-list">
        <div v-for="exchange in pendingExchanges" :key="exchange.id" class="exchange-card">
          <div class="exchange-header">
            <div class="exchange-users">
              <el-avatar :src="getUserAvatar(exchange.initiatorId)" :size="40" />
              <el-icon class="exchange-icon"><Switch /></el-icon>
              <el-avatar :src="getUserAvatar(exchange.partnerId)" :size="40" />
            </div>
            <div class="exchange-status pending">
              待确认 {{ exchange.confirmedBy.length }}/2
            </div>
          </div>

          <div class="exchange-skills">
            <div class="skill-col">
              <span class="label">你将教授:</span>
              <span v-for="skill in getMyTeachSkills(exchange)" :key="skill" class="skill-tag skill-teach">{{ skill }}</span>
            </div>
            <div class="skill-col">
              <span class="label">你将学习:</span>
              <span v-for="skill in getMyLearnSkills(exchange)" :key="skill" class="skill-tag skill-learn">{{ skill }}</span>
            </div>
          </div>

          <div class="exchange-footer">
            <span class="exchange-time">{{ formatTime(exchange.createdAt) }}</span>
            <div class="exchange-actions">
              <el-button type="primary" @click="confirmExchange(exchange)" :disabled="exchange.confirmedBy.includes(myId)" :loading="confirmingId === exchange.id">
                <el-icon><Check /></el-icon>
                {{ exchange.confirmedBy.includes(myId) ? '已确认' : '确认完成' }}
              </el-button>
              <el-button @click="goToChat(exchange)">
                <el-icon><ChatDotRound /></el-icon>联系对方
              </el-button>
            </div>
          </div>
        </div>
        <el-empty v-if="pendingExchanges.length === 0" description="暂无待确认的交换" />
      </div>

      <div v-if="activeTab === 'completed'" class="exchange-list">
        <div v-for="exchange in completedExchanges" :key="exchange.id" class="exchange-card">
          <div class="exchange-header">
            <div class="exchange-users">
              <el-avatar :src="getUserAvatar(exchange.initiatorId)" :size="40" />
              <el-icon class="exchange-icon"><Switch /></el-icon>
              <el-avatar :src="getUserAvatar(exchange.partnerId)" :size="40" />
            </div>
            <div class="exchange-status completed">
              ✅ 已完成
            </div>
          </div>

          <div class="exchange-skills">
            <div class="skill-col">
              <span class="label">教授:</span>
              <span v-for="skill in getMyTeachSkills(exchange)" :key="skill" class="skill-tag skill-teach">{{ skill }}</span>
            </div>
            <div class="skill-col">
              <span class="label">学习:</span>
              <span v-for="skill in getMyLearnSkills(exchange)" :key="skill" class="skill-tag skill-learn">{{ skill }}</span>
            </div>
          </div>

          <div class="exchange-footer">
            <span class="exchange-time">完成于 {{ formatTime(exchange.completedAt) }}</span>
            <div class="exchange-actions">
              <el-button type="success" @click="showReviewDialog(exchange)" :disabled="hasReviewed(exchange)">
                <el-icon><Star /></el-icon>
                {{ hasReviewed(exchange) ? '已评价' : '去评价' }}
              </el-button>
            </div>
          </div>
        </div>
        <el-empty v-if="completedExchanges.length === 0" description="暂无已完成的交换" />
      </div>
    </div>

    <el-dialog v-model="showReview" title="评价这次交换" width="500px">
      <div v-if="currentExchange" class="review-form">
        <div class="review-user">
          <el-avatar :src="getUserAvatar(getOtherUserId(currentExchange))" :size="56" />
          <span class="username">{{ getUserName(getOtherUserId(currentExchange)) }}</span>
        </div>
        <el-form :model="reviewForm" label-position="top">
          <el-form-item label="评分">
            <el-rate v-model="reviewForm.rating" size="large" />
          </el-form-item>
          <el-form-item label="评价内容">
            <el-input v-model="reviewForm.comment" type="textarea" :rows="4" placeholder="分享一下这次交换的体验..." maxlength="500" show-word-limit />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="showReview = false">取消</el-button>
        <el-button type="primary" @click="submitReview" :loading="submitting">提交评价</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { exchangeAPI, reviewAPI, authAPI } from '../api'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import { Switch, Check, ChatDotRound, Star } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()
const myId = userStore.user?.id

const exchanges = ref([])
const users = ref({})
const activeTab = ref('pending')
const confirmingId = ref(null)
const showReview = ref(false)
const currentExchange = ref(null)
const submitting = ref(false)
const reviewForm = ref({ rating: 5, comment: '' })

const pendingExchanges = computed(() =>
  exchanges.value.filter(e => e.status === 'pending')
)

const completedExchanges = computed(() =>
  exchanges.value.filter(e => e.status === 'completed')
)

onMounted(async () => {
  await loadExchanges()
})

async function loadExchanges() {
  const res = await exchangeAPI.getExchanges()
  exchanges.value = res.data

  const userIds = new Set()
  exchanges.value.forEach(e => {
    userIds.add(e.initiatorId)
    userIds.add(e.partnerId)
  })

  for (const id of userIds) {
    try {
      const userRes = await authAPI.getUser(id)
      users.value[id] = userRes.data
    } catch (e) {}
  }
}

function getUserAvatar(id) {
  return users.value[id]?.avatar || ''
}

function getUserName(id) {
  return users.value[id]?.username || '未知用户'
}

function getOtherUserId(exchange) {
  return exchange.initiatorId === myId ? exchange.partnerId : exchange.initiatorId
}

function getMyTeachSkills(exchange) {
  if (exchange.initiatorId === myId) {
    return exchange.skills?.teach || []
  } else {
    return exchange.skills?.learn || []
  }
}

function getMyLearnSkills(exchange) {
  if (exchange.initiatorId === myId) {
    return exchange.skills?.learn || []
  } else {
    return exchange.skills?.teach || []
  }
}

function formatTime(time) {
  return dayjs(time).format('YYYY-MM-DD HH:mm')
}

async function confirmExchange(exchange) {
  try {
    confirmingId.value = exchange.id
    await exchangeAPI.confirmExchange(exchange.id)
    ElMessage.success('确认成功')
    await loadExchanges()
  } catch (e) {
    ElMessage.error('确认失败')
  } finally {
    confirmingId.value = null
  }
}

function goToChat(exchange) {
  const otherId = getOtherUserId(exchange)
  router.push(`/chat/${otherId}`)
}

function hasReviewed(exchange) {
  return exchange.reviewedBy?.includes(myId)
}

function showReviewDialog(exchange) {
  currentExchange.value = exchange
  reviewForm.value = { rating: 5, comment: '' }
  showReview.value = true
}

async function submitReview() {
  if (!currentExchange.value) return
  if (!reviewForm.value.rating) {
    ElMessage.warning('请选择评分')
    return
  }

  try {
    submitting.value = true
    await reviewAPI.createReview({
      exchangeId: currentExchange.value.id,
      targetUserId: getOtherUserId(currentExchange.value),
      rating: reviewForm.value.rating,
      comment: reviewForm.value.comment
    })

    if (!currentExchange.value.reviewedBy) {
      currentExchange.value.reviewedBy = []
    }
    currentExchange.value.reviewedBy.push(myId)

    ElMessage.success('评价成功')
    showReview.value = false
  } catch (e) {
    ElMessage.error(e.message || '评价失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.exchanges {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.exchange-tabs {
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

.exchange-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.exchange-card {
  background: #fafafa;
  border-radius: 16px;
  padding: 24px;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.exchange-card:hover {
  border-color: #667eea;
}

.exchange-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.exchange-users {
  display: flex;
  align-items: center;
  gap: 12px;
}

.exchange-icon {
  font-size: 24px;
  color: #667eea;
}

.exchange-status {
  padding: 6px 16px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 14px;
}

.exchange-status.pending {
  background: #fff7e6;
  color: #fa8c16;
}

.exchange-status.completed {
  background: #f6ffed;
  color: #52c41a;
}

.exchange-skills {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 12px;
}

.skill-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skill-col .label {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.exchange-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.exchange-time {
  color: #999;
  font-size: 13px;
}

.exchange-actions {
  display: flex;
  gap: 12px;
}

.review-form {
  text-align: center;
}

.review-user {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.review-user .username {
  font-weight: 600;
  font-size: 18px;
  color: #333;
}
</style>
