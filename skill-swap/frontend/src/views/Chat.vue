<template>
  <div class="chat-page">
    <div class="chat-layout">
      <div class="sidebar">
        <div class="sidebar-header">
          <h3>消息列表</h3>
        </div>
        <div class="conversation-list">
          <div
            v-for="conv in conversations"
            :key="conv.userId"
            class="conversation-item"
            :class="{ active: currentUserId === conv.userId }"
            @click="selectConversation(conv.userId)"
          >
            <el-avatar :src="conv.avatar" :size="48" />
            <div class="conv-info">
              <div class="conv-header">
                <span class="conv-name">{{ conv.username }}</span>
                <span class="conv-time">{{ formatTime(conv.lastMessageTime) }}</span>
              </div>
              <div class="conv-message">
                <span class="last-msg">{{ conv.lastMessage }}</span>
                <el-badge v-if="conv.unreadCount > 0" :value="conv.unreadCount" class="unread-badge" />
              </div>
            </div>
          </div>
          <el-empty v-if="conversations.length === 0" description="暂无消息" />
        </div>
      </div>

      <div class="chat-main">
        <div v-if="currentUser" class="chat-header">
          <el-avatar :src="currentUser.avatar" :size="40" />
          <span class="chat-username">{{ currentUser.username }}</span>
          <div class="header-actions">
            <el-button type="primary" size="small" @click="showExchangeDialog = true">
              <el-icon><Handshake /></el-icon>发起交换
            </el-button>
          </div>
        </div>

        <div v-if="currentUserId" class="messages-container" ref="messagesContainer">
          <div v-for="msg in messages" :key="msg.id" class="message-row" :class="msg.senderId === myId ? 'sent' : 'received'">
            <el-avatar v-if="msg.senderId !== myId" :src="currentUser?.avatar" :size="32" />
            <div class="chat-bubble" :class="msg.senderId === myId ? 'sent' : 'received'">
              {{ msg.content }}
            </div>
          </div>
          <el-empty v-if="messages.length === 0" description="开始你们的对话吧" />
        </div>

        <div v-else class="chat-empty">
          <el-icon size="64"><ChatDotRound /></el-icon>
          <p>选择一个会话开始聊天</p>
        </div>

        <div v-if="currentUserId" class="chat-input-area">
          <el-input
            v-model="messageInput"
            placeholder="输入消息..."
            size="large"
            @keyup.enter="sendMessage"
          >
            <template #append>
              <el-button type="primary" @click="sendMessage" :loading="sending">
                <el-icon><Promotion /></el-icon>发送
              </el-button>
            </template>
          </el-input>
        </div>
      </div>
    </div>

    <el-dialog v-model="showExchangeDialog" title="发起技能交换" width="500px">
      <el-form :model="exchangeForm" label-position="top">
        <el-form-item label="你想教授的技能">
          <el-select v-model="exchangeForm.teachSkill" placeholder="选择你可以教的技能" style="width: 100%">
            <el-option v-for="s in myTeachSkills" :key="s.id" :label="s.name" :value="s.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="你想学习的技能">
          <el-select v-model="exchangeForm.learnSkill" placeholder="选择你想要学习的技能" style="width: 100%">
            <el-option v-for="s in otherTeachSkills" :key="s.id" :label="s.name" :value="s.name" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showExchangeDialog = false">取消</el-button>
        <el-button type="primary" @click="createExchange">确认发起</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { messageAPI, skillAPI, exchangeAPI, authAPI } from '../api'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import { ChatDotRound, Promotion, Handshake } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const myId = userStore.user?.id

const conversations = ref([])
const messages = ref([])
const currentUserId = ref(null)
const currentUser = ref(null)
const messageInput = ref('')
const sending = ref(false)
const messagesContainer = ref(null)
const showExchangeDialog = ref(false)
const myTeachSkills = ref([])
const otherTeachSkills = ref([])
const exchangeForm = ref({
  teachSkill: '',
  learnSkill: ''
})

onMounted(async () => {
  await loadConversations()
  if (route.params.userId) {
    await selectConversation(route.params.userId)
  }
})

watch(() => route.params.userId, async (newId) => {
  if (newId) {
    await selectConversation(newId)
  }
})

async function loadConversations() {
  try {
    const res = await messageAPI.getConversations()
    conversations.value = res.data
  } catch (e) {}
}

async function selectConversation(userId) {
  currentUserId.value = userId
  await loadMessages(userId)
  await loadConversations()

  const userRes = await authAPI.getUser(userId)
  currentUser.value = userRes.data

  const [mySkills, otherSkills] = await Promise.all([
    skillAPI.getSkills({ userId: myId, type: 'teach' }),
    skillAPI.getSkills({ userId, type: 'teach' })
  ])
  myTeachSkills.value = mySkills.data
  otherTeachSkills.value = otherSkills.data
}

async function loadMessages(userId) {
  try {
    const res = await messageAPI.getMessages(userId)
    messages.value = res.data
    await nextTick()
    scrollToBottom()
  } catch (e) {}
}

async function sendMessage() {
  if (!messageInput.value.trim()) return
  try {
    sending.value = true
    await messageAPI.sendMessage({
      receiverId: currentUserId.value,
      content: messageInput.value.trim()
    })
    messageInput.value = ''
    await loadMessages(currentUserId.value)
    await loadConversations()
  } catch (e) {
    ElMessage.error('发送失败')
  } finally {
    sending.value = false
  }
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function formatTime(time) {
  const now = dayjs()
  const msgTime = dayjs(time)
  if (now.diff(msgTime, 'day') === 0) {
    return msgTime.format('HH:mm')
  } else if (now.diff(msgTime, 'day') === 1) {
    return '昨天'
  } else {
    return msgTime.format('MM-DD')
  }
}

async function createExchange() {
  try {
    await exchangeAPI.createExchange({
      partnerId: currentUserId.value,
      skills: {
        teach: [exchangeForm.value.teachSkill],
        learn: [exchangeForm.value.learnSkill]
      }
    })
    ElMessage.success('交换请求已发送')
    showExchangeDialog.value = false
    exchangeForm.value = { teachSkill: '', learnSkill: '' }
  } catch (e) {
    ElMessage.error('发起失败')
  }
}
</script>

<style scoped>
.chat-page {
  height: calc(100vh - 120px);
}

.chat-layout {
  display: flex;
  height: 100%;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.sidebar {
  width: 320px;
  border-right: 1px solid #eee;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.conversation-list {
  flex: 1;
  overflow-y: auto;
}

.conversation-item {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 1px solid #f5f5f5;
}

.conversation-item:hover {
  background: #f5f7ff;
}

.conversation-item.active {
  background: #eef1ff;
}

.conv-info {
  flex: 1;
  min-width: 0;
}

.conv-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.conv-name {
  font-weight: 600;
  color: #333;
}

.conv-time {
  font-size: 12px;
  color: #999;
}

.conv-message {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.last-msg {
  color: #666;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
}

.unread-badge {
  margin-left: 8px;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  border-bottom: 1px solid #eee;
}

.chat-username {
  font-weight: 600;
  font-size: 16px;
  color: #333;
  flex: 1;
}

.messages-container {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background: #fafafa;
}

.message-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.message-row.sent {
  flex-direction: row-reverse;
}

.chat-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  gap: 16px;
}

.chat-input-area {
  padding: 16px 24px;
  border-top: 1px solid #eee;
}
</style>
