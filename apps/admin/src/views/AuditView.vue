<script setup lang="ts">
import { onMounted, ref } from 'vue';
import dayjs from 'dayjs';
import { ElMessage } from 'element-plus';
import { get, patch } from '../lib/api';
import type { AdminNotification, AdminOverview } from '../types';

const notifications = ref<AdminNotification[]>([]);
const topics = ref<AdminOverview['hotTopics']>([]);
const loading = ref(false);

async function loadAudit() {
  loading.value = true;
  try {
    const [notificationResponse, overview] = await Promise.all([
      get<{ items: AdminNotification[] }>('/admin/notifications'),
      get<AdminOverview>('/admin/overview'),
    ]);
    notifications.value = notificationResponse.items;
    topics.value = overview.hotTopics;
  } catch (error) {
    console.error(error);
    ElMessage.error('审计数据加载失败');
  } finally {
    loading.value = false;
  }
}

async function togglePin(topicId: string, pinned: boolean) {
  try {
    await patch(`/admin/topics/${topicId}/pin`, { pinned });
    await loadAudit();
  } catch (error) {
    console.error(error);
    ElMessage.error('置顶操作失败');
  }
}

onMounted(() => {
  void loadAudit();
});
</script>

<template>
  <div class="page-grid two-columns" v-loading="loading">
    <el-card>
      <template #header>
        <div class="card-title-row">
          <span>互动消息审计</span>
          <span class="muted-text">点赞、评论、关注、AI 互动统一审计</span>
        </div>
      </template>
      <div class="audit-list">
        <article v-for="item in notifications" :key="item.id" class="audit-item">
          <div class="card-title-row">
            <strong>{{ item.title }}</strong>
            <span class="muted-text">{{ dayjs(item.createdAt).format('MM-DD HH:mm') }}</span>
          </div>
          <p class="muted-text">
            {{ item.actor?.displayName || '系统' }} -> {{ item.recipient.displayName }}
          </p>
          <p>{{ item.content || item.post?.excerpt || '无附加内容' }}</p>
        </article>
      </div>
    </el-card>

    <el-card>
      <template #header>
        <div class="card-title-row">
          <span>热搜置顶管理</span>
          <span class="muted-text">置顶项会优先出现在广场热搜</span>
        </div>
      </template>
      <div class="audit-list">
        <article v-for="topic in topics" :key="topic.id" class="audit-item">
          <div class="card-title-row">
            <strong>#{{ topic.keyword }}</strong>
            <el-switch :model-value="topic.pinned" @change="togglePin(topic.id, Boolean($event))" />
          </div>
          <p class="muted-text">热度分 {{ topic.score.toFixed(1) }}</p>
        </article>
      </div>
    </el-card>
  </div>
</template>

