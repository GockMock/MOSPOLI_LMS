import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import PlaceholderView from '../views/PlaceholderView.vue'

const routes = [
  {
    path: '/',
    name: 'Login',
    component: Login,
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: PlaceholderView,
    props: {
      title: 'Личный кабинет',
      description: 'Будущая главная страница пользователя MOSPOLI LMS.',
    },
  },
  {
    path: '/courses',
    name: 'Courses',
    component: PlaceholderView,
    props: {
      title: 'Мои курсы',
      description: 'Будущий раздел со списком курсов и дисциплин.',
    },
  },
  {
    path: '/assignments',
    name: 'Assignments',
    component: PlaceholderView,
    props: {
      title: 'Задания',
      description: 'Будущий раздел учебных заданий и сроков сдачи.',
    },
  },
  {
    path: '/grades',
    name: 'Grades',
    component: PlaceholderView,
    props: {
      title: 'Оценки',
      description: 'Будущий раздел оценок, баллов и прогресса обучения.',
    },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: PlaceholderView,
    props: {
      title: 'Профиль пользователя',
      description: 'Будущий раздел профиля и настроек аккаунта.',
    },
  },
  {
    path: '/help',
    name: 'Help',
    component: PlaceholderView,
    props: {
      title: 'Помощь',
      description: 'Будущий раздел помощи по работе с LMS.',
    },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
