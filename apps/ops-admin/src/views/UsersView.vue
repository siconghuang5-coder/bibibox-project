<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { get } from '../lib/api';
import type { AdminUser } from '../types';

const loading = ref(false);
const query = reactive({
  q: '',
  accountType: '',
});
const users = ref<AdminUser[]>([]);
const selected = ref<any>(null);
const drawerVisible = ref(false);
const assetBase = import.meta.env.BASE_URL;

function resolveAvatar(url: string | null) {
  if (url?.trim()) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return url.startsWith('/') ? `${assetBase}${url.slice(1)}` : `${assetBase}${url}`;
  }
  return `${assetBase}avatars/avatar-6.png`;
}

async function loadUsers() {
  loading.value = true;
  try {
    const response = await get<{ items: AdminUser[] }>('/admin/users', {
      q: query.q || undefined,
      accountType: query.accountType || undefined,
    });
    users.value = response.items;
  } catch (error) {
    console.error(error);
    ElMessage.error('用户列表加载失败');
  } finally {
    loading.value = false;
  }
}

async function openDetail(id: string) {
  try {
    selected.value = await get(`/admin/users/${id}`);
    drawerVisible.value = true;
  } catch (error) {
    console.error(error);
    ElMessage.error('用户详情加载失败');
  }
}

onMounted(() => {
  void loadUsers();
});
</script>

<template>
  <div class="page-stack">
    <el-card>
      <div class="toolbar">
        <el-input v-model="query.q" placeholder="搜用户名/昵称" clearable />
        <el-select v-model="query.accountType" placeholder="账号类型" clearable>
          <el-option label="普通用户" value="USER" />
          <el-option label="数字人" value="DIGITAL_HUMAN" />
        </el-select>
        <el-button type="primary" @click="loadUsers">筛选</el-button>
      </div>
    </el-card>

    <el-card>
      <template #header>
        <div class="card-title-row">
          <span>用户管理</span>
          <span class="muted-text">展示一期账号主表和数字人扩展字段</span>
        </div>
      </template>
      <el-table :data="users" v-loading="loading" stripe>
        <el-table-column label="账号" min-width="200">
          <template #default="{ row }">
            <div class="user-cell">
              <img :src="resolveAvatar(row.avatarUrl)" class="mini-avatar" :alt="row.displayName" />
              <div>
                <strong>{{ row.displayName }}</strong>
                <p>@{{ row.username }}</p>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="accountType" label="类型" width="140" />
        <el-table-column prop="tagline" label="定位" min-width="220" />
        <el-table-column label="关注/动态" width="140">
          <template #default="{ row }">{{ row.stats.followers }} / {{ row.stats.posts }}</template>
        </el-table-column>
        <el-table-column label="预售" width="100">
          <template #default="{ row }">{{ row.isPresale ? '是' : '否' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row.id)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-drawer v-model="drawerVisible" title="用户详情" size="520px">
      <pre v-if="selected" class="json-view">{{ JSON.stringify(selected, null, 2) }}</pre>
    </el-drawer>
  </div>
</template>
