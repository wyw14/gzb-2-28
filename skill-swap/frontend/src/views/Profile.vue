<template>
  <div class="profile">
    <div class="card profile-header-card">
      <div class="profile-header">
        <el-avatar :src="userStore.user?.avatar" :size="100" />
        <div class="profile-info">
          <h1 class="username">{{ userStore.user?.username }}</h1>
          <div class="user-meta">
            <el-rate :model-value="userStore.user?.rating" disabled />
            <span class="rating">{{ userStore.user?.rating }}</span>
            <span class="divider">|</span>
            <span>{{ userStore.user?.exchangeCount || 0 }} 次交换</span>
            <span class="divider">|</span>
            <span>{{ userStore.user?.skillPoints || 0 }} 技能点</span>
          </div>
          <p class="bio">{{ userStore.user?.bio || '这个人很懒，什么都没写' }}</p>
        </div>
        <el-button type="primary" @click="showEditDialog = true">
          <el-icon><Edit /></el-icon>编辑资料
        </el-button>
      </div>
    </div>

    <div class="profile-grid">
      <div class="card">
        <h2 class="section-title">🎓 我的技能</h2>
        <div class="skills-tabs">
          <span class="tab" :class="{ active: skillTab === 'teach' }" @click="skillTab = 'teach'">可教</span>
          <span class="tab" :class="{ active: skillTab === 'learn' }" @click="skillTab = 'learn'">想学</span>
        </div>
        <div v-if="filteredSkills.length" class="skills-list">
          <div v-for="skill in filteredSkills" :key="skill.id" class="skill-item">
            <span class="skill-name">{{ skill.name }}</span>
            <span class="skill-level" v-if="skill.level">{{ skill.level }}</span>
            <span class="skill-desc">{{ skill.description }}</span>
          </div>
        </div>
        <el-empty v-else description="暂无技能" />
      </div>

      <div class="card">
        <h2 class="section-title">⭐ 收到的评价</h2>
        <div v-if="reviews.length" class="reviews-list">
          <div v-for="review in reviews" :key="review.id" class="review-item">
            <div class="review-header">
              <el-avatar :src="review.reviewerAvatar" :size="40" />
              <div class="reviewer-info">
                <span class="reviewer-name">{{ review.reviewerName }}</span>
                <el-rate :model-value="review.rating" disabled size="small" />
              </div>
              <span class="review-time">{{ formatTime(review.createdAt) }}</span>
            </div>
            <p class="review-content">{{ review.comment }}</p>
          </div>
        </div>
        <el-empty v-else description="暂无评价" />
      </div>
    </div>

    <el-dialog v-model="showEditDialog" title="编辑个人资料" width="500px">
      <el-form :model="editForm" label-position="top">
        <el-form-item label="个人简介">
          <el-input v-model="editForm.bio" type="textarea" :rows="3" placeholder="介绍一下自己..." maxlength="200" show-word-limit />
        </el-form-item>
        <el-form-item label="所在城市">
          <el-input v-model="editForm.city" placeholder="城市" />
        </el-form-item>
        <el-form-item label="省份">
          <el-input v-model="editForm.province" placeholder="省份" />
        </el-form-item>
        <el-form-item label="可用时间">
          <el-checkbox-group v-model="editForm.availableTime">
            <el-checkbox value="工作日白天">工作日白天</el-checkbox>
            <el-checkbox value="工作日晚上">工作日晚上</el-checkbox>
            <el-checkbox value="周末白天">周末白天</el-checkbox>
            <el-checkbox value="周末晚上">周末晚上</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="偏好学习方式">
          <el-radio-group v-model="editForm.onlinePreference">
            <el-radio value="online">线上</el-radio>
            <el-radio value="offline">线下</el-radio>
            <el-radio value="both">都可以</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="saveProfile" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useUserStore } from '../stores/user'
import { skillAPI, reviewAPI } from '../api'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import { Edit } from '@element-plus/icons-vue'

const userStore = useUserStore()
const mySkills = ref([])
const reviews = ref([])
const skillTab = ref('teach')
const showEditDialog = ref(false)
const saving = ref(false)
const editForm = ref({
  bio: '',
  city: '',
  province: '',
  availableTime: [],
  onlinePreference: 'both'
})

const filteredSkills = computed(() =>
  mySkills.value.filter(s => s.type === skillTab.value)
)

onMounted(async () => {
  await loadMySkills()
  await loadReviews()
  initEditForm()
})

function initEditForm() {
  const prefs = userStore.user?.preferences || {}
  editForm.value = {
    bio: userStore.user?.bio || '',
    city: prefs.location?.city || '',
    province: prefs.location?.province || '',
    availableTime: prefs.time || [],
    onlinePreference: prefs.onlinePreference || 'both'
  }
}

async function loadMySkills() {
  const res = await skillAPI.getSkills({ userId: userStore.user.id })
  mySkills.value = res.data
}

async function loadReviews() {
  try {
    const res = await reviewAPI.getReviews(userStore.user.id)
    reviews.value = res.data
  } catch (e) {}
}

async function saveProfile() {
  try {
    saving.value = true
    await userStore.updateProfile({
      bio: editForm.value.bio,
      preferences: {
        location: {
          city: editForm.value.city,
          province: editForm.value.province
        },
        time: editForm.value.availableTime,
        onlinePreference: editForm.value.onlinePreference
      }
    })
    ElMessage.success('保存成功')
    showEditDialog.value = false
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

function formatTime(time) {
  return dayjs(time).format('YYYY-MM-DD')
}
</script>

<style scoped>
.profile {
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

.skills-tabs {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  border-bottom: 2px solid #eee;
}

.tab {
  padding: 12px 0;
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

.skills-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skill-item {
  display: grid;
  grid-template-columns: 1fr auto 2fr;
  gap: 16px;
  align-items: center;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.skill-name {
  font-weight: 600;
  color: #333;
}

.skill-level {
  background: #e3f2fd;
  color: #1565c0;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
}

.skill-desc {
  color: #666;
  font-size: 13px;
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

.review-time {
  font-size: 12px;
  color: #999;
}

.review-content {
  color: #666;
  line-height: 1.6;
  margin: 0;
}
</style>
