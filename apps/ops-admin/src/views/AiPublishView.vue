<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { get, post } from '../lib/api';
import type { AdminUser, DraftResponse } from '../types';

const digitalHumans = ref<AdminUser[]>([]);
const generating = ref(false);
const publishing = ref(false);
const scheduling = ref(false);
const draft = ref<DraftResponse | null>(null);
const form = reactive({
  digitalHumanId: '',
  topic: '周末情绪疗愈小贴士',
  scope: 'SQUARE' as 'MOMENTS' | 'SQUARE',
  prompt: '',
  generateImage: false,
  scheduledAt: '',
});

const selectedHuman = computed(() => digitalHumans.value.find((item) => item.id === form.digitalHumanId) || null);

async function loadDigitalHumans() {
  const response = await get<{ items: AdminUser[] }>('/admin/users', { accountType: 'DIGITAL_HUMAN' });
  digitalHumans.value = response.items;
  if (!form.digitalHumanId && response.items[0]) {
    form.digitalHumanId = response.items[0].id;
  }
}

async function generateDraft() {
  generating.value = true;
  try {
    draft.value = await post<DraftResponse>('/admin/ai-publish/generate', {
      digitalHumanId: form.digitalHumanId,
      topic: form.topic,
      scope: form.scope,
      prompt: form.prompt || undefined,
      generateImage: form.generateImage,
    });
    ElMessage.success(draft.value.mode === 'coze' ? '已通过 Coze 生成草稿' : 'Coze 不可用，已返回本地回退草稿');
  } catch (error) {
    console.error(error);
    ElMessage.error('生成失败');
  } finally {
    generating.value = false;
  }
}

async function publishNow() {
  if (!draft.value) {
    ElMessage.warning('请先生成草稿');
    return;
  }
  publishing.value = true;
  try {
    await post('/admin/ai-publish/publish', {
      digitalHumanId: form.digitalHumanId,
      scope: form.scope,
      content: draft.value.content,
    });
    ElMessage.success('已发布');
  } catch (error) {
    console.error(error);
    ElMessage.error('发布失败');
  } finally {
    publishing.value = false;
  }
}

async function schedulePublish() {
  if (!form.scheduledAt) {
    ElMessage.warning('请选择定时时间');
    return;
  }
  scheduling.value = true;
  try {
    await post('/admin/ai-publish/schedule', {
      digitalHumanId: form.digitalHumanId,
      topic: form.topic,
      scope: form.scope,
      prompt: form.prompt || undefined,
      generateImage: form.generateImage,
      scheduledAt: form.scheduledAt,
    });
    ElMessage.success('已加入定时队列');
  } catch (error) {
    console.error(error);
    ElMessage.error('定时失败');
  } finally {
    scheduling.value = false;
  }
}

onMounted(() => {
  void loadDigitalHumans();
});
</script>

<template>
  <div class="page-grid two-columns">
    <el-card>
      <template #header>
        <div class="card-title-row">
          <span>数字人一键生成动态</span>
          <span class="muted-text">后端代调 Coze，图片未配置时会明确提示未启用</span>
        </div>
      </template>
      <el-form label-position="top">
        <el-form-item label="数字人">
          <el-select v-model="form.digitalHumanId" filterable placeholder="选择数字人">
            <el-option
              v-for="item in digitalHumans"
              :key="item.id"
              :label="`${item.displayName} · ${item.tagline}`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="主题">
          <el-input v-model="form.topic" />
        </el-form-item>
        <el-form-item label="发布位置">
          <el-segmented v-model="form.scope" :options="['MOMENTS', 'SQUARE']" />
        </el-form-item>
        <el-form-item label="附加提示词">
          <el-input v-model="form.prompt" type="textarea" :rows="3" placeholder="可选，用来细化这次草稿方向" />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="form.generateImage">尝试生成图片</el-checkbox>
        </el-form-item>
        <div class="toolbar compact">
          <el-button type="primary" :loading="generating" @click="generateDraft">先生成草稿</el-button>
          <el-button :loading="publishing" @click="publishNow">立即发布</el-button>
        </div>
      </el-form>
    </el-card>

    <el-card>
      <template #header>
        <div class="card-title-row">
          <span>草稿预览与定时</span>
          <span class="muted-text">{{ selectedHuman?.displayName || '未选择数字人' }}</span>
        </div>
      </template>
      <div v-if="draft" class="draft-card">
        <p class="muted-text">来源：{{ draft.mode === 'coze' ? 'Coze 实时生成' : '本地回退模板' }}</p>
        <p class="draft-content">{{ draft.content }}</p>
        <el-alert
          :title="draft.image.enabled ? '图片工作流已配置，可继续扩展图片生成。' : '图片工作流未配置，本次只生成文案。'"
          :type="draft.image.enabled ? 'success' : 'warning'"
          :closable="false"
        />
      </div>
      <div v-else class="empty-state">先选择数字人并生成草稿，这里会显示文案预览。</div>

      <el-divider />

      <el-form label-position="top">
        <el-form-item label="定时发布时间">
          <el-date-picker
            v-model="form.scheduledAt"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss"
            placeholder="选择发布时间"
          />
        </el-form-item>
        <el-button type="primary" :loading="scheduling" @click="schedulePublish">加入定时任务</el-button>
      </el-form>
    </el-card>
  </div>
</template>

