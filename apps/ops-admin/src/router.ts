import { createRouter, createWebHashHistory } from 'vue-router';
import { TOKEN_KEY } from './lib/api';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', name: 'login', component: () => import('./views/LoginView.vue') },
    { path: '/dashboard', name: 'dashboard', component: () => import('./views/DashboardView.vue') },
    { path: '/users', name: 'users', component: () => import('./views/UsersView.vue') },
    { path: '/posts', name: 'posts', component: () => import('./views/PostsView.vue') },
    { path: '/products', name: 'products', component: () => import('./views/ProductsView.vue') },
    { path: '/orders', name: 'orders', component: () => import('./views/OrdersView.vue') },
    { path: '/assets', name: 'assets', component: () => import('./views/AssetsView.vue') },
    { path: '/chats', name: 'chats', component: () => import('./views/ChatsView.vue') },
    { path: '/ai-publish', name: 'ai-publish', component: () => import('./views/AiPublishView.vue') },
    { path: '/audit', name: 'audit', component: () => import('./views/AuditView.vue') },
  ],
});

router.beforeEach((to) => {
  const hasToken = Boolean(localStorage.getItem(TOKEN_KEY));
  if (to.name !== 'login' && !hasToken) {
    return { name: 'login' };
  }
  if (to.name === 'login' && hasToken) {
    return { name: 'dashboard' };
  }
  return true;
});

export default router;
