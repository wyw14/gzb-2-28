<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <div class="logo">🔄</div>
        <h1>技能交换社区</h1>
        <p>分享你的技能，学习新的本领</p>
      </div>
      <el-form :model="form" :rules="rules" ref="formRef" @submit.prevent="handleLogin">
        <el-form-item prop="email">
          <el-input v-model="form.email" placeholder="邮箱地址" size="large">
            <template #prefix><el-icon><Message /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" size="large" show-password>
            <template #prefix><el-icon><Lock /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-button type="primary" size="large" class="submit-btn" @click="handleLogin" :loading="loading">
          登录
        </el-button>
      </el-form>
      <div class="auth-footer">
        还没有账号？<router-link to="/register">立即注册</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'
import { Message, Lock } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref()
const loading = ref(false)
const form = ref({
  email: '',
  password: ''
})

const rules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ]
}

async function handleLogin() {
  try {
    await formRef.value.validate()
    loading.value = true
    await userStore.login(form.value)
    ElMessage.success('登录成功')
    router.push('/')
  } catch (e) {
    if (e.message) {
      ElMessage.error(e.message)
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.auth-card {
  background: white;
  border-radius: 20px;
  padding: 48px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  font-size: 64px;
  margin-bottom: 16px;
}

.auth-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  margin-bottom: 8px;
}

.auth-header p {
  color: #999;
  font-size: 14px;
}

.submit-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  margin-top: 8px;
}

.submit-btn:hover {
  opacity: 0.9;
}

.auth-footer {
  text-align: center;
  margin-top: 24px;
  color: #666;
  font-size: 14px;
}

.auth-footer a {
  color: #667eea;
  font-weight: 500;
  text-decoration: none;
}
</style>
