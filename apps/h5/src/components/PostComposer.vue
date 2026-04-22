<script setup lang="ts">
import { onBeforeUnmount, reactive, ref } from 'vue';
import { showFailToast, showSuccessToast } from 'vant';
import { post, upload } from '../lib/api';
import type { PostItem } from '../types';

const props = defineProps<{
  defaultScope?: 'MOMENTS' | 'SQUARE';
}>();

const emit = defineEmits<{
  created: [post: PostItem];
}>();

const submitting = ref(false);
const selectedFiles = ref<File[]>([]);
const previewUrls = ref<string[]>([]);
const form = reactive({
  scope: props.defaultScope ?? 'MOMENTS',
  content: '',
});

function cleanupPreviews() {
  previewUrls.value.forEach((url) => URL.revokeObjectURL(url));
  previewUrls.value = [];
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const nextFiles = Array.from(input.files ?? []).slice(0, 4);
  cleanupPreviews();
  selectedFiles.value = nextFiles;
  previewUrls.value = nextFiles.map((file) => URL.createObjectURL(file));
}

function removeImage(index: number) {
  const nextFiles = [...selectedFiles.value];
  nextFiles.splice(index, 1);
  selectedFiles.value = nextFiles;
  cleanupPreviews();
  previewUrls.value = nextFiles.map((file) => URL.createObjectURL(file));
}

async function submit() {
  if (!form.content.trim() && selectedFiles.value.length === 0) {
    showFailToast('先写点内容吧');
    return;
  }

  submitting.value = true;
  try {
    let mediaUrls: string[] | undefined;

    if (selectedFiles.value.length > 0) {
      const formData = new FormData();
      selectedFiles.value.forEach((file) => formData.append('files', file));
      const uploaded = await upload<{ items: Array<{ url: string }> }>('/uploads/images', formData);
      mediaUrls = uploaded.items.map((item) => item.url);
    }

    const created = await post<PostItem>('/posts', {
      scope: form.scope,
      content: form.content,
      mediaUrls,
    });
    form.content = '';
    selectedFiles.value = [];
    cleanupPreviews();
    showSuccessToast('动态已发布');
    emit('created', created);
  } catch (error) {
    showFailToast('发布失败，请稍后再试');
    console.error(error);
  } finally {
    submitting.value = false;
  }
}

onBeforeUnmount(() => {
  cleanupPreviews();
});
</script>

<template>
  <div class="composer-card">
    <div class="composer-header">
      <div>
        <p class="composer-title">写一条新的动态</p>
        <p class="composer-subtitle">支持在文案里输入 `@用户名` 触发提醒</p>
      </div>
      <van-radio-group v-model="form.scope" direction="horizontal" class="scope-switch">
        <van-radio name="MOMENTS">朋友圈</van-radio>
        <van-radio name="SQUARE">广场</van-radio>
      </van-radio-group>
    </div>
    <van-field
      v-model="form.content"
      type="textarea"
      rows="4"
      maxlength="280"
      show-word-limit
      placeholder="今天想让朋友和广场看到什么？"
      class="composer-field"
    />
    <label class="upload-panel">
      <span>添加图片（最多 4 张）</span>
      <input type="file" accept="image/*" multiple @change="handleFileChange" />
    </label>
    <div v-if="previewUrls.length" class="preview-grid">
      <div v-for="(url, index) in previewUrls" :key="url" class="preview-card">
        <img :src="url" class="preview-image" alt="预览图片" />
        <button type="button" class="preview-remove" @click="removeImage(index)">移除</button>
      </div>
    </div>
    <div class="composer-footer">
      <span class="composer-hint">支持上传最多 4 张图片；AI 出图仍按后台工作流配置决定。</span>
      <van-button round type="primary" :loading="submitting" @click="submit">发布</van-button>
    </div>
  </div>
</template>
