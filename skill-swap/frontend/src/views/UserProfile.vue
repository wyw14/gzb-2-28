<template>
  <div class="user-profile">
    <div v-if="user" class="card profile-header-card">
      <div class="profile-header">
        <el-avatar :src="user.avatar" :size="100" />
        <div class="profile-info">
          <h1 class="username">{{ user.username }}</h1>
          <div class="user-meta">
            <el-rate :model-value="user.rating" disabled />
            <span class="rating">{{ user.rating }}</span>
            <span class="divider">|</span>
            <span>{{ user.exchangeCount || 0 }} 次交换</span>
            <span class="divider">|</span>
            <span>{{ user.skillPoints || 0 }} 技能点</span>
          </div>
          <p class="bio">{{ user.bio || '这个人很懒，什么都没写' }}</p>
        </div>
        <div class="action-buttons">
          <el-button type="primary" @click="goToChat">
            <el-icon><ChatDotRound /></el-icon>发送消息
          </el-button>
        </div>
      </div>
    </div>

    <div v-if="user" class="profile-grid">
      <div class="card">
        <h2 class="section-title">🎓 技能</h2>
        <div class="skills-section">
          <div class="skill-type">
            <h3 class="subsection-title">可教</h3>
            <div class="skills-tags">
              <span v-for="skill in teachSkills" :key="skill.id" class="skill-tag skill-teach">
                {{ skill.name }}
                <small>{{ skill.level }}</small>
              </span>
            </div>
            <el-empty v-if="teachSkills.length === 0" description="暂无" :image-size="60" />
          </div>
          <div class="skill-type">
            <h3 class="subsection-title">想学</h3>
            <div class="skills-tags">
              <span v-for="skill in learnSkills" :key="skill.id" class="skill-tag skill-learn">
                {{ skill.name }}
              </span>
            </div>
            <el-empty v-if="learnSkills.length === 0" description="暂无" :image-size="60" />
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="section-title">⭐ 评价</h2>
        <div v-if="reviews.length" class="reviews-list">
          <div v-for="review in reviews" :key="review.id" class="review-item">
            <div class="review-header">
              <el-avatar :src="review.reviewerAvatar" :size="40" />
              <div class="reviewer-info">
                <span class="reviewer-name">{{ review.reviewerName }}</span>
                <el-rate :model-value="review.rating" disabled size="small" />
              </div>
            </div>
            <p class="review-content">{{ review.comment }}</p>
          </div>
        </div>
        <el-empty v-else description="暂无评价" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authAPI, reviewAPI } from '../api'

const route = useRoute()
const router = useRouter()
const user = ref(null)
const reviews = ref([])

const teachSkills = computed(() => user.value?.skills?.filter(s => s.type === 'teach') || [])
const learnSkills = computed(() => user.value?.skills?.filter(s => s.type === 'learn') || [])

onMounted(async () => {
  await loadUser()
  await loadReviews()
})

async function loadUser() {
  try {
    const res = await authAPI.getUser(route.params.userId)
    user.value = res.data
  } catch (e) {}
}

async function loadReviews() {
  try {
    const res = await reviewAPI.getReviews(route.params.userId)
    reviews.value = res.data
  } catch (e) {}
}

function goToChat() {
  router.push(`/chat/${route.params.userId}`)
}
</script>

<style scoped>
.user-profile {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.profile-header-card {
  padding: 32px;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 24px;
}

.profile-info {
  flex: 1;
}

.username {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  margin-bottom: 8px;
}

.user-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #666;
  font-size: 14px;
  margin-bottom: 12px;
}

.rating {
  font-weight: 600;
  color: #ff9800;
}

.divider {
  color: #ddd;
}

.bio {
  color: #666;
  line-height: 1.6;
}

.profile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.skills-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.skill-type {
  margin-bottom: 0;
}

.subsection-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.skills-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.skill-tag small {
  opacity: 0.8;
  margin-left: 4px;
}

.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.review-item {
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.review-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.reviewer-info {
  flex: 1;
}

.reviewer-name {
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 4px;
}

.review-content {
  color: #666;
  line-height: 1.6;
  margin: 0;
}
</style>
