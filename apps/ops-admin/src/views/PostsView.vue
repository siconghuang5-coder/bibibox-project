<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { get, post } from '../lib/api';
import type { AdminPost, AdminUser } from '../types';

const loading = ref(false);
const posts = ref<AdminPost[]>([]);
const users = ref<AdminUser[]>([]);
const query = reactive({
  scope: '',
  source: '',
  q: '',
});
const impersonateDialog = ref(false);
const impersonateForm = reactive({
  authorId: '',
  scope: 'MOMENTS' as 'MOMENTS' | 'SQUARE',
  content: '',
});

async function loadPosts() {
  loading.value = true;
  try {
    const response = await get<{ items: AdminPost[] }>('/admin/posts', {
      q: query.q || undefined,
      scope: query.scope || undefined,
      source: query.source || undefined,
    });
    posts.value = response.items;
  } catch (error) {
    console.error(error);
    ElMessage.error('动态列表加载失败');
  } finally {
    loading.value = false;
  }
}

async function loadUsers() {
  const response = await get<{ items: AdminUser[] }>('/admin/users');
  users.value = response.items;
}

async function impersonate() {
  try {
    await post('/admin/posts/impersonate', impersonateForm);
    ElMessage.success('代发成功，已写入审计日志');
    impersonateDialog.value = false;
    impersonateForm.content = '';
    await loadPosts();
  } catch (error) {
    console.error(error);
    ElMessage.error('代发失败');
  }
}

onMounted(async () => {
  await Promise.all([loadPosts(), loadUsers()]);
});
</script>

<template>
  <div class="page-stack">
    <el-card>
      <div class="toolbar">
        <el-input v-model="query.q" placeholder="搜内容关键词" clearable />
        <el-select v-model="query.scope" placeholder="范围" clearable>
          <el-option label="朋友圈" value="MOMENTS" />
          <el-option label="广场" value="SQUARE" />
        </el-select>
        <el-select v-model="query.source" placeholder="来源" clearable>
          <el-option label="人工发布" value="MANUAL" />
          <el-option label="AI 发布" value="AI" />
          <el-option label="后台代发" value="ADMIN_IMPERSONATED" />
        </el-select>
        <el-button type="primary" @click="loadPosts">筛选</el-button>
        <el-button @click="impersonateDialog = true">上帝视角代发</el-button>
      </div>
    </el-card>

    <el-card>
      <template #header>
        <div class="card-title-row">
          <span>动态管理</span>
          <span class="muted-text">支持按范围、来源和内容检索</span>
        </div>
      </template>
      <el-table :data="posts" v-loading="loading" stripe>
        <el-table-column label="作者" width="180">
          <template #default="{ row }">
            <div>
              <strong>{{ row.author.displayName }}</strong>
              <p>{{ row.author.accountType }}</p>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="scope" label="范围" width="120" />
        <el-table-column prop="source" label="来源" width="160" />
        <el-table-column prop="content" label="内容" min-width="340" show-overflow-tooltip />
        <el-table-column label="互动" width="120">
          <template #default="{ row }">{{ row.stats.likes }} 赞 / {{ row.stats.comments }} 评</template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="impersonateDialog" title="上帝视角动态发布器" width="640px">
      <el-form label-position="top">
        <el-form-item label="代发账号">
          <el-select v-model="impersonateForm.authorId" filterable placeholder="选择现有账号">
            <el-option v-for="item in users" :key="item.id" :label="`${item.displayName} (@${item.username})`" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="发布位置">
          <el-segmented v-model="impersonateForm.scope" :options="['MOMENTS', 'SQUARE']" />
        </el-form-item>
        <el-form-item label="动态内容">
          <el-input v-model="impersonateForm.content" type="textarea" :rows="5" maxlength="280" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="impersonateDialog = false">取消</el-button>
        <el-button type="primary" @click="impersonate">立即代发</el-button>
      </template>
    </el-dialog>
  </div>
</template>

