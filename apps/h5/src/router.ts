import { createRouter, createWebHashHistory } from 'vue-router';
import { TOKEN_KEY } from './lib/api';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/moments',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('./views/LoginView.vue'),
    },
    {
      path: '/moments',
      name: 'moments',
      component: () => import('./views/MomentsView.vue'),
    },
    {
      path: '/square',
      name: 'square',
      component: () => import('./views/SquareView.vue'),
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: () => import('./views/NotificationsView.vue'),
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('./views/ProfileView.vue'),
    },
  ],
});

router.beforeEach((to) => {
  const hasToken = Boolean(localStorage.getItem(TOKEN_KEY));
  if (to.name !== 'login' && !hasToken) {
    return { name: 'login' };
  }
  if (to.name === 'login' && hasToken) {
    return { name: 'moments' };
  }
  return true;
});

export default router;

