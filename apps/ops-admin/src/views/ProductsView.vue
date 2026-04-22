<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { get, post } from '../lib/api';
import type { AdminProduct, AdminUser } from '../types';

const loading = ref(false);
const products = ref<AdminProduct[]>([]);
const humans = ref<AdminUser[]>([]);
const dialogVisible = ref(false);
const query = reactive({
  q: '',
  productType: '',
});
const form = reactive({
  id: '',
  slug: '',
  name: '',
  subtitle: '',
  description: '',
  productType: 'DIGITAL_HUMAN',
  status: 'ACTIVE',
  priceCoins: 0,
  stock: 1,
  coverUrl: '',
  badge: '',
  sortOrder: 0,
  relatedAccountId: '',
});

async function loadProducts() {
  loading.value = true;
  try {
    const response = await get<{ items: AdminProduct[] }>('/admin/products', {
      q: query.q || undefined,
      productType: query.productType || undefined,
    });
    products.value = response.items;
  } catch (error) {
    console.error(error);
    ElMessage.error('商品列表加载失败');
  } finally {
    loading.value = false;
  }
}

async function loadHumans() {
  const response = await get<{ items: AdminUser[] }>('/admin/users', { accountType: 'DIGITAL_HUMAN' });
  humans.value = response.items;
}

function openCreate() {
  Object.assign(form, {
    id: '',
    slug: '',
    name: '',
    subtitle: '',
    description: '',
    productType: 'DIGITAL_HUMAN',
    status: 'ACTIVE',
    priceCoins: 0,
    stock: 1,
    coverUrl: '',
    badge: '',
    sortOrder: 0,
    relatedAccountId: '',
  });
  dialogVisible.value = true;
}

function openEdit(item: AdminProduct) {
  Object.assign(form, {
    id: item.id,
    slug: item.slug,
    name: item.name,
    subtitle: item.subtitle || '',
    description: item.description || '',
    productType: item.productType,
    status: item.status,
    priceCoins: item.priceCoins,
    stock: item.stock ?? 0,
    coverUrl: item.coverUrl || '',
    badge: item.badge || '',
    sortOrder: item.sortOrder,
    relatedAccountId: item.relatedAccountId || '',
  });
  dialogVisible.value = true;
}

async function saveProduct() {
  try {
    await post('/admin/products', {
      ...form,
      stock: form.stock === null || form.stock === undefined ? undefined : Number(form.stock),
      sortOrder: Number(form.sortOrder),
      priceCoins: Number(form.priceCoins),
      relatedAccountId: form.relatedAccountId || undefined,
      coverUrl: form.coverUrl || undefined,
      badge: form.badge || undefined,
      subtitle: form.subtitle || undefined,
      description: form.description || undefined,
    });
    ElMessage.success('商品已保存');
    dialogVisible.value = false;
    await loadProducts();
  } catch (error) {
    console.error(error);
    ElMessage.error('保存失败');
  }
}

onMounted(async () => {
  await Promise.all([loadProducts(), loadHumans()]);
});
</script>

<template>
  <div class="page-stack">
    <el-card>
      <div class="toolbar">
        <el-input v-model="query.q" placeholder="搜商品名/副标题" clearable />
        <el-select v-model="query.productType" placeholder="商品类型" clearable>
          <el-option label="数字人" value="DIGITAL_HUMAN" />
          <el-option label="礼物" value="GIFT" />
          <el-option label="精选商品" value="MERCH" />
        </el-select>
        <el-button type="primary" @click="loadProducts">筛选</el-button>
        <el-button @click="openCreate">新增商品</el-button>
      </div>
    </el-card>

    <el-card>
      <template #header>
        <div class="card-title-row">
          <span>商品目录</span>
          <span class="muted-text">支持数字人商品、礼物和精选商品统一运营</span>
        </div>
      </template>
      <el-table :data="products" v-loading="loading" stripe>
        <el-table-column prop="name" label="商品名" min-width="180" />
        <el-table-column prop="productType" label="类型" width="140" />
        <el-table-column prop="status" label="状态" width="120" />
        <el-table-column prop="priceCoins" label="价格(币)" width="120" />
        <el-table-column prop="stock" label="库存" width="100" />
        <el-table-column label="绑定数字人" min-width="180">
          <template #default="{ row }">{{ row.relatedAccount?.displayName || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑商品' : '新增商品'" width="720px">
      <el-form label-position="top">
        <el-form-item label="Slug">
          <el-input v-model="form.slug" />
        </el-form-item>
        <el-form-item label="商品名">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="副标题">
          <el-input v-model="form.subtitle" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
        <div class="page-grid two-columns">
          <el-form-item label="类型">
            <el-select v-model="form.productType">
              <el-option label="数字人" value="DIGITAL_HUMAN" />
              <el-option label="礼物" value="GIFT" />
              <el-option label="精选商品" value="MERCH" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="form.status">
              <el-option label="ACTIVE" value="ACTIVE" />
              <el-option label="SOLD_OUT" value="SOLD_OUT" />
              <el-option label="ARCHIVED" value="ARCHIVED" />
            </el-select>
          </el-form-item>
          <el-form-item label="价格(币)">
            <el-input-number v-model="form.priceCoins" :min="0" />
          </el-form-item>
          <el-form-item label="库存">
            <el-input-number v-model="form.stock" :min="0" />
          </el-form-item>
          <el-form-item label="封面地址">
            <el-input v-model="form.coverUrl" />
          </el-form-item>
          <el-form-item label="角标">
            <el-input v-model="form.badge" />
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number v-model="form.sortOrder" :min="0" />
          </el-form-item>
          <el-form-item label="绑定数字人">
            <el-select v-model="form.relatedAccountId" clearable placeholder="礼物/商品可留空">
              <el-option
                v-for="item in humans"
                :key="item.id"
                :label="`${item.displayName} (@${item.username})`"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveProduct">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
