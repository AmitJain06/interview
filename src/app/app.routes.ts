import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';

export const routes: Routes = [
  { path: '', component: Dashboard, title: 'Interview App | Dashboard' },
  {
    path: 'interviews',
    loadComponent: () => import('./pages/interviews/interviews').then((m) => m.Interviews),
    title: 'Interview App | Interviews',
    children: [
      { path: '', redirectTo: 'coding', pathMatch: 'full' },
      {
        path: 'coding',
        loadComponent: () => import('./pages/interviews/coding/coding').then((m) => m.CodingRound),
        title: 'Interview App | Coding Round',
      },
      {
        path: 'system-design',
        loadComponent: () => import('./pages/interviews/system-design/system-design').then((m) => m.SystemDesignRound),
        title: 'Interview App | System Design Round',
      },
    ],
  },
  {
    path: 'coding',
    loadComponent: () => import('./pages/coding/coding').then((m) => m.Coding),
    title: 'Interview App | Coding',
    children: [
      {
        path: 'leet-code-863',
        loadComponent: () => import('./pages/coding/leet-code-863/leet-code-863').then((m) => m.LeetCode863),
        title: 'Interview App | LeetCode 863',
      },
    ],
  },
  {
    path: 'system-design',
    loadComponent: () => import('./pages/system-design/system-design').then((m) => m.SystemDesign),
    title: 'Interview App | System Design',
    children: [
      {
        path: 'top-k',
        loadComponent: () => import('./pages/system-design/top-k/top-k').then((m) => m.TopK),
        title: 'Interview App | Top-K',
      },
      {
        path: 'ticketmaster',
        loadComponent: () =>
          import('./pages/system-design/ticketmaster/ticketmaster').then((m) => m.Ticketmaster),
        title: 'Interview App | Ticketmaster',
      },
      {
        path: 'uber',
        loadComponent: () => import('./pages/system-design/uber/uber').then((m) => m.Uber),
        title: 'Interview App | Uber',
      },
      {
        path: 'sharding',
        loadComponent: () => import('./pages/system-design/sharding/sharding').then((m) => m.Sharding),
        title: 'Interview App | Sharding',
      },
    ],
  },
  {
    path: 'dsa',
    loadComponent: () => import('./pages/dsa/dsa').then((m) => m.DSA),
    title: 'Interview App | DSA',
    children: [
      {
        path: '',
        redirectTo: 'dynamic-programming',
        pathMatch: 'full',
      },
      {
        path: 'dynamic-programming',
        loadComponent: () =>
          import('./pages/dsa/dynamic-programming/dynamic-programming').then((m) => m.DynamicProgramming),
        title: 'Interview App | Dynamic Programming',
      },
    ],
  },
  {
    path: 'candidates',
    loadComponent: () => import('./pages/candidates/candidates').then((m) => m.Candidates),
    title: 'Interview App | Candidates',
  },
  {
    path: 'reports',
    loadComponent: () => import('./pages/reports/reports').then((m) => m.Reports),
    title: 'Interview App | Reports',
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings').then((m) => m.Settings),
    title: 'Interview App | Settings',
  },
  { path: '**', redirectTo: '' },
];
