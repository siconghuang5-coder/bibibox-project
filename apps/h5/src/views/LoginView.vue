<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { showFailToast, showSuccessToast } from 'vant';
import { useSessionStore } from '../stores/session';

const router = useRouter();
const session = useSessionStore();
const activeTab = ref<'login' | 'register'>('login');
const loginForm = reactive({
  identifier: 'nova',
  password: 'Demo@123456',
  accountType: 'USER' as 'USER' | 'DIGITAL_HUMAN',
});
const registerForm = reactive({
  username: '',
  displayName: '',
  email: '',
  password: '',
});

async function handleLogin() {
  try {
    await session.login(loginForm);
    showSuccessToast('登录成功');
    router.replace('/moments');
  } catch (error) {
    showFailToast('登录失败，请检查账号密码');
    console.error(error);
  }
}

async function handleRegister() {
  try {
    await session.register({
      username: registerForm.username,
      displayName: registerForm.displayName,
      email: registerForm.email || undefined,
      password: registerForm.password,
    });
    showSuccessToast('注册成功');
    router.replace('/moments');
  } catch (error) {
    showFailToast('注册失败，请检查输入');
    console.error(error);
  }
}

function fillDemo(accountType: 'USER' | 'DIGITAL_HUMAN') {
  if (accountType === 'USER') {
    loginForm.identifier = 'nova';
    loginForm.password = 'Demo@123456';
    loginForm.accountType = 'USER';
    return;
  }

  loginForm.identifier = 'mobai';
  loginForm.password = 'Human@123456';
  loginForm.accountType = 'DIGITAL_HUMAN';
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-hero">
      <p class="eyebrow">AI Social MVP</p>
      <h1>AI 社交模块一期</h1>
      <p class="hero-copy">
        这不是原型拼接版，而是按 `H5 + 管理后台 + API` 重建后的工程化入口。先用种子账号进来体验全链路。
      </p>
    </div>

    <div class="auth-card">
      <van-tabs v-model:active="activeTab" animated>
        <van-tab title="登录" name="login">
          <div class="auth-form">
            <van-radio-group v-model="loginForm.accountType" direction="horizontal" class="account-switch">
              <van-radio name="USER">普通用户</van-radio>
              <van-radio name="DIGITAL_HUMAN">数字人账号</van-radio>
            </van-radio-group>
            <van-field v-model="loginForm.identifier" label="账号" placeholder="用户名或邮箱" />
            <van-field v-model="loginForm.password" label="密码" type="password" placeholder="请输入密码" />
            <van-button block round type="primary" :loading="session.loading" @click="handleLogin">进入一期 H5</van-button>
            <div class="demo-grid">
              <button type="button" class="demo-chip" @click="fillDemo('USER')">填充用户 Demo</button>
              <button type="button" class="demo-chip" @click="fillDemo('DIGITAL_HUMAN')">填充数字人 Demo</button>
            </div>
          </div>
        </van-tab>
        <van-tab title="注册" name="register">
          <div class="auth-form">
            <van-field v-model="registerForm.username" label="用户名" placeholder="4-20 位字母数字或下划线" />
            <van-field v-model="registerForm.displayName" label="昵称" placeholder="展示名称" />
            <van-field v-model="registerForm.email" label="邮箱" placeholder="可选" />
            <van-field v-model="registerForm.password" label="密码" type="password" placeholder="至少 8 位" />
            <van-button block round type="primary" :loading="session.loading" @click="handleRegister">创建账号</van-button>
          </div>
        </van-tab>
      </van-tabs>
    </div>
  </div>
</template>

