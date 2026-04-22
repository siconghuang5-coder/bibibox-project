<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { get } from '../lib/api';
import type { AdminConversation } from '../types';

const loading = ref(false);
const conversations = ref<AdminConversation[]>([]);
const selected = ref<AdminConversation | null>(null);
const drawerVisible = ref(false);
const query = reactive({
  q: '',
});

async function loadChats() {
  loading.value = true;
  try {
    const response = await get<{ items: AdminConversation[] }>('/admin/chats', {
      q: query.q || undefined,
    });
    conversations.value = response.items;
  } catch (error) {
    console.error(error);
    ElMessage.error('会话巡检加载失败');
  } finally {
    loading.value = false;
  }
}

function openDetail(item: AdminConversation) {
  selected.value = item;
  drawerVisible.value = true;
}

onMounted(() => {
  void loadChats();
});
</script>

<template>
  <div class="page-stack">
    <el-card>
      <div class="toolbar">
        <el-input v-model="query.q" placeholder="搜用户 / 数字人" clearable />
        <el-button type="primary" @click="loadChats">筛选</el-button>
      </div>
    </el-card>

    <el-card>
      <template #header>
        <div class="card-title-row">
          <span>会话巡检</span>
          <span class="muted-text">查看用户与数字人之间的最近消息摘要</span>
        </div>
      </template>
      <el-table :data="conversations" v-loading="loading" stripe>
        <el-table-column label="会话" min-width="220">
          <template #default="{ row }">{{ row.owner.displayName }} ↔ {{ row.digitalHuman.displayName }}</template>
        </el-table-column>
        <el-table-column prop="unreadCount" label="未读" width="100" />
        <el-table-column label="最近更新" min-width="180">
          <template #default="{ row }">{{ row.updatedAt }}</template>
        </el-table-column>
        <el-table-column label="最近消息" min-width="320">
          <template #default="{ row }">
            <div v-for="message in row.messages" :key="message.id">
              [{{ message.role }}] {{ message.textContent || message.transcription || message.messageType }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-drawer v-model="drawerVisible" title="会话详情" size="520px">
      <pre v-if="selected" class="json-view">{{ JSON.stringify(selected, null, 2) }}</pre>
    </el-drawer>
  </div>
</template>
