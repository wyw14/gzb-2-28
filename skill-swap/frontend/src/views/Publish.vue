<template>
  <div class="publish">
    <div class="card">
      <h1 class="page-title">发布你的技能</h1>

      <div class="skill-tabs">
        <div
          v-for="tab in tabs"
          :key="tab.value"
          class="tab-item"
          :class="{ active: activeTab === tab.value }"
          @click="activeTab = tab.value"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span>{{ tab.label }}</span>
        </div>
      </div>

      <div v-if="mySkills.length" class="my-skills">
        <h3 class="subsection-title">我已发布的{{ activeTab === 'teach' ? '可教' : '想学' }}</h3>
        <div class="skills-list">
          <div v-for="skill in filteredSkills" :key="skill.id" class="skill-item">
            <span class="skill-name">{{ skill.name }}</span>
            <span class="skill-category">{{ getCategoryName(skill.category) }}</span>
            <span class="skill-level">{{ skill.level }}</span>
            <span class="skill-desc">{{ skill.description }}</span>
            <el-button type="danger" size="small" @click="deleteSkill(skill.id)">删除</el-button>
          </div>
        </div>
      </div>

      <el-form :model="form" :rules="rules" ref="formRef" class="publish-form">
        <el-form-item prop="name" label="技能名称">
          <el-input v-model="form.name" placeholder="例如：Python编程、吉他演奏、英语口语" size="large" />
        </el-form-item>

        <el-form-item prop="category" label="技能类别">
          <el-select v-model="form.category" placeholder="选择类别" size="large" style="width: 100%">
            <el-option v-for="cat in categories" :key="cat.id" :label="`${cat.icon} ${cat.name}`" :value="cat.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="技能等级" v-if="activeTab === 'teach'">
          <el-radio-group v-model="form.level" size="large">
            <el-radio value="入门">入门</el-radio>
            <el-radio value="初级">初级</el-radio>
            <el-radio value="中级">中级</el-radio>
            <el-radio value="高级">高级</el-radio>
            <el-radio value="专家">专家</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="简单描述一下这个技能..."
            maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="期望学习方式">
          <el-radio-group v-model="form.onlinePreference" size="large">
            <el-radio value="online">线上</el-radio>
            <el-radio value="offline">线下</el-radio>
            <el-radio value="both">都可以</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="可用时间段">
          <el-checkbox-group v-model="form.availableTime">
            <el-checkbox value="工作日白天">工作日白天</el-checkbox>
            <el-checkbox value="工作日晚上">工作日晚上</el-checkbox>
            <el-checkbox value="周末白天">周末白天</el-checkbox>
            <el-checkbox value="周末晚上">周末晚上</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-button type="primary" size="large" @click="publish" :loading="loading">
          {{ activeTab === 'teach' ? '发布可教技能' : '发布想学技能' }}
        </el-button>
      </el-form>
    </div>

    <div class="card" v-if="!hasPreferences">
      <h2 class="section-title">📍 设置偏好</h2>
      <p class="tip">完善你的时间和地域偏好，获得更精准的匹配</p>
      <el-form :model="prefsForm" class="prefs-form">
        <el-form-item label="所在城市">
          <el-input v-model="prefsForm.city" placeholder="例如：北京市朝阳区" size="large" />
        </el-form-item>
        <el-form-item label="省份">
          <el-input v-model="prefsForm.province" placeholder="例如：北京市" size="large" />
        </el-form-item>
        <el-button type="primary" @click="savePreferences">保存偏好</el-button>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useUserStore } from '../stores/user'
import { skillAPI, authAPI } from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'

const userStore = useUserStore()
const formRef = ref()
const loading = ref(false)
const activeTab = ref('teach')
const categories = ref([])
const mySkills = ref([])
const hasPreferences = ref(false)

const tabs = [
  { value: 'teach', label: '我可以教', icon: '🎓' },
  { value: 'learn', label: '我想要学', icon: '📖' }
]

const form = ref({
  name: '',
  category: '',
  type: 'teach',
  level: '中级',
  description: '',
  onlinePreference: 'both',
  availableTime: []
})

const prefsForm = ref({
  city: '',
  province: ''
})

const rules = {
  name: [{ required: true, message: '请输入技能名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择技能类别', trigger: 'change' }]
}

const filteredSkills = computed(() =>
  mySkills.value.filter(s => s.type === activeTab.value)
)

onMounted(async () => {
  await loadCategories()
  await loadMySkills()
  checkPreferences()
})

async function loadCategories() {
  const res = await skillAPI.getCategories()
  categories.value = res.data
}

async function loadMySkills() {
  const res = await skillAPI.getSkills({ userId: userStore.user.id })
  mySkills.value = res.data
}

function checkPreferences() {
  const prefs = userStore.user?.preferences
  hasPreferences.value = prefs?.location?.city && prefs?.location?.province
  if (prefs) {
    prefsForm.value.city = prefs.location?.city || ''
    prefsForm.value.province = prefs.location?.province || ''
  }
}

function getCategoryName(id) {
  const cat = categories.value.find(c => c.id === id)
  return cat ? `${cat.icon} ${cat.name}` : id
}

async function publish() {
  try {
    await formRef.value.validate()
    loading.value = true
    await skillAPI.createSkill({
      ...form.value,
      type: activeTab.value
    })
    ElMessage.success('发布成功')
    form.value = {
      name: '',
      category: '',
      type: activeTab.value,
      level: '中级',
      description: '',
      onlinePreference: 'both',
      availableTime: []
    }
    await loadMySkills()
  } catch (e) {
    ElMessage.error('发布失败')
  } finally {
    loading.value = false
  }
}

async function deleteSkill(id) {
  try {
    await ElMessageBox.confirm('确定删除这个技能吗？', '提示', { type: 'warning' })
    await skillAPI.deleteSkill(id)
    ElMessage.success('删除成功')
    await loadMySkills()
  } catch {}
}

async function savePreferences() {
  await userStore.updateProfile({
    preferences: {
      ...userStore.user.preferences,
      location: {
        city: prefsForm.value.city,
        province: prefsForm.value.province
      }
    }
  })
  ElMessage.success('偏好设置成功')
  hasPreferences.value = true
}
</script>

<style scoped>
.publish {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.skill-tabs {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
}

.tab-item:hover {
  background: #e8eaf6;
}

.tab-item.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.tab-icon {
  font-size: 24px;
}

.my-skills {
  margin-bottom: 32px;
}

.subsection-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.skills-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skill-item {
  display: grid;
  grid-template-columns: 1fr auto auto 1fr auto;
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

.skill-category {
  color: #667eea;
  font-size: 13px;
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

.publish-form {
  max-width: 600px;
}

.tip {
  color: #666;
  margin-bottom: 16px;
}

.prefs-form {
  max-width: 500px;
}
</style>
