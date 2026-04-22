<script setup lang="ts">
import { reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAdminSessionStore } from '../stores/session';

const router = useRouter();
const session = useAdminSessionStore();
const form = reactive({
  identifier: 'opsadmin',
  password: 'Admin@123456',
});

async function submit() {
  try {
    await session.login(form.identifier, form.password);
    ElMessage.success('欢迎回来');
    router.replace('/dashboard');
  } catch (error) {
    console.error(error);
    ElMessage.error('登录失败，请检查管理员账号');
  }
}
</script>

<template>
  <div class="admin-login">
    <div class="login-panel">
      <div class="login-copy">
        <p class="eyebrow">AI Social Admin</p>
        <h1>一期运营控制台</h1>
        <p>覆盖用户管理、动态管理、上帝视角代发、数字人 AI 发帖、互动消息审计和热搜置顶。</p>
      </div>
      <el-form label-position="top" class="login-form">
        <el-form-item label="管理员账号">
          <el-input v-model="form.identifier" placeholder="opsadmin" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" show-password placeholder="Admin@123456" />
        </el-form-item>
        <el-button type="primary" size="large" :loading="session.loading" @click="submit">进入后台</el-button>
      </el-form>
    </div>
  </div>
</template>

