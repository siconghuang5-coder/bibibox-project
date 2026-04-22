<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { get } from '../lib/api';
import type { AdminOverview } from '../types';

const overview = ref<AdminOverview | null>(null);
const loading = ref(false);

async function loadOverview() {
  loading.value = true;
  try {
    overview.value = await get<AdminOverview>('/admin/overview');
  } catch (error) {
    console.error(error);
    ElMessage.error('总览加载失败');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadOverview();
});
</script>

<template>
  <div class="page-stack" v-loading="loading">
    <section class="hero-card">
      <div>
        <p class="eyebrow">Overview</p>
        <h2>一期 AI 社交运营总览</h2>
        <p>这里聚合用户、数字人、动态、待处理消息和待执行定时任务。</p>
      </div>
    </section>

    <div v-if="overview" class="metric-grid">
      <article class="metric-card">
        <span>总账号</span>
        <strong>{{ overview.metrics.accounts }}</strong>
      </article>
      <article class="metric-card">
        <span>普通用户</span>
        <strong>{{ overview.metrics.users }}</strong>
      </article>
      <article class="metric-card">
        <span>数字人</span>
        <strong>{{ overview.metrics.digitalHumans }}</strong>
      </article>
      <article class="metric-card">
        <span>动态数</span>
        <strong>{{ overview.metrics.posts }}</strong>
      </article>
      <article class="metric-card">
        <span>未读互动</span>
        <strong>{{ overview.metrics.unreadNotifications }}</strong>
      </article>
      <article class="metric-card">
        <span>定时任务</span>
        <strong>{{ overview.metrics.scheduledTasks }}</strong>
      </article>
    </div>

    <el-card v-if="overview">
      <template #header>
        <div class="card-title-row">
          <span>当前热搜榜</span>
          <span class="muted-text">可在审计页置顶/取消置顶</span>
        </div>
      </template>
      <div class="topic-pills">
        <span v-for="topic in overview.hotTopics" :key="topic.id" class="topic-pill" :class="{ pinned: topic.pinned }">
          #{{ topic.keyword }}
        </span>
      </div>
    </el-card>
  </div>
</template>

