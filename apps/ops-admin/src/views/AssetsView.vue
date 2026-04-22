<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { get } from '../lib/api';
import type { AdminAsset } from '../types';

const loading = ref(false);
const assets = ref<AdminAsset[]>([]);
const query = reactive({
  q: '',
});

async function loadAssets() {
  loading.value = true;
  try {
    const response = await get<{ items: AdminAsset[] }>('/admin/assets', {
      q: query.q || undefined,
    });
    assets.value = response.items;
  } catch (error) {
    console.error(error);
    ElMessage.error('资产列表加载失败');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadAssets();
});
</script>

<template>
  <div class="page-stack">
    <el-card>
      <div class="toolbar">
        <el-input v-model="query.q" placeholder="搜资产名 / 用户名 / 昵称" clearable />
        <el-button type="primary" @click="loadAssets">筛选</el-button>
      </div>
    </el-card>

    <el-card>
      <template #header>
        <div class="card-title-row">
          <span>资产审计</span>
          <span class="muted-text">跟踪商品成交后形成的资产归属</span>
        </div>
      </template>
      <el-table :data="assets" v-loading="loading" stripe>
        <el-table-column prop="title" label="资产" min-width="180" />
        <el-table-column prop="assetType" label="类型" width="120" />
        <el-table-column label="归属用户" min-width="180">
          <template #default="{ row }">{{ row.account.displayName }} / @{{ row.account.username }}</template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="100" />
        <el-table-column label="来源商品" min-width="160">
          <template #default="{ row }">{{ row.product?.slug || '-' }}</template>
        </el-table-column>
        <el-table-column prop="orderId" label="订单号" min-width="180" />
      </el-table>
    </el-card>
  </div>
</template>
