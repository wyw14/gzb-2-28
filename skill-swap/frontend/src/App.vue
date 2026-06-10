<template>
  <el-config-provider>
    <div class="app">
      <nav v-if="userStore.token" class="navbar">
        <div class="nav-container">
          <router-link to="/" class="logo">
            <span class="logo-icon">🔄</span>
            <span class="logo-text">技能交换社区</span>
          </router-link>
          <div class="nav-menu">
            <router-link to="/" class="nav-link">
              <el-icon><HomeFilled /></el-icon>
              <span>首页</span>
            </router-link>
            <router-link to="/publish" class="nav-link">
              <el-icon><Edit /></el-icon>
              <span>发布技能</span>
            </router-link>
            <router-link to="/matches" class="nav-link">
              <el-icon><Connection /></el-icon>
              <span>智能匹配</span>
            </router-link>
            <router-link to="/chat" class="nav-link">
              <el-icon><ChatDotRound /></el-icon>
              <span>消息</span>
            </router-link>
            <router-link to="/skill-tree" class="nav-link">
              <el-icon><Share /></el-icon>
              <span>技能树</span>
            </router-link>
            <router-link to="/rankings" class="nav-link">
              <el-icon><Trophy /></el-icon>
              <span>排行榜</span>
            </router-link>
            <router-link to="/exchanges" class="nav-link">
              <el-icon><SwitchButton /></el-icon>
              <span>交换记录</span>
            </router-link>
          </div>
          <div class="nav-user">
            <el-dropdown @command="handleCommand">
              <span class="user-info">
                <el-avatar :src="userStore.user?.avatar" :size="36" />
                <span class="username">{{ userStore.user?.username }}</span>
                <el-icon><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">
                    <el-icon><User /></el-icon>个人中心
                  </el-dropdown-item>
                  <el-dropdown-item command="logout" divided>
                    <el-icon><SwitchButton /></el-icon>退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </nav>
      <main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </el-config-provider>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useUserStore } from './stores/user'
import { ElMessageBox } from 'element-plus'
import {
  HomeFilled, Edit, Connection, ChatDotRound,
  Share, Trophy, SwitchButton, User, ArrowDown
} from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

async function handleCommand(command) {
  if (command === 'profile') {
    router.push('/profile')
  } else if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      userStore.logout()
      router.push('/login')
    } catch {}
  }
}
</script>

<style scoped>
.app {
  min-height: 100vh;
}

.navbar {
  background: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.nav-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 700;
  color: #667eea;
  text-decoration: none;
}

.logo-icon {
  font-size: 28px;
}

.nav-menu {
  display: flex;
  gap: 8px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  color: #666;
  text-decoration: none;
  font-size: 14px;
  transition: all 0.3s;
}

.nav-link:hover,
.nav-link.router-link-active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.nav-user .user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.username {
  font-weight: 500;
  color: #333;
}

.main-content {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  min-height: calc(100vh - 64px);
}
</style>
