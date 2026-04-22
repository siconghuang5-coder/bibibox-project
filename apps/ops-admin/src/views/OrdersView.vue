<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { get } from '../lib/api';
import type { AdminOrder } from '../types';

const loading = ref(false);
const orders = ref<AdminOrder[]>([]);
const query = reactive({
  q: '',
});

async function loadOrders() {
  loading.value = true;
  try {
    const response = await get<{ items: AdminOrder[] }>('/admin/orders', {
      q: query.q || undefined,
    });
    orders.value = response.items;
  } catch (error) {
    console.error(error);
    ElMessage.error('订单列表加载失败');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadOrders();
});
</script>

<template>
  <div class="page-stack">
    <el-card>
      <div class="toolbar">
        <el-input v-model="query.q" placeholder="搜订单号 / 用户名 / 昵称" clearable />
        <el-button type="primary" @click="loadOrders">筛选</el-button>
      </div>
    </el-card>

    <el-card>
      <template #header>
        <div class="card-title-row">
          <span>订单流水</span>
          <span class="muted-text">查看平台币购买产生的订单与余额变化</span>
        </div>
      </template>
      <el-table :data="orders" v-loading="loading" stripe>
        <el-table-column prop="id" label="订单号" min-width="220" />
        <el-table-column label="用户" min-width="160">
          <template #default="{ row }">{{ row.account.displayName }} / @{{ row.account.username }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120" />
        <el-table-column prop="totalCoins" label="总额(币)" width="120" />
        <el-table-column prop="walletBalanceAfter" label="余额" width="120" />
        <el-table-column label="商品明细" min-width="320">
          <template #default="{ row }">
            <div v-for="item in row.items" :key="item.id">{{ item.productName }} x{{ item.quantity }}</div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>
