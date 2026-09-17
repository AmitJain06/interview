import type { BehavioralQuestion } from './behavioral';

/**
 * Behavioral & situational interview questions.
 *
 * The list is intentionally empty for now — questions will be added here in the future.
 *
 * To add a new question:
 *   1. Push an entry to this array, e.g.:
 *      {
 *        title: 'Tell me about yourself',
 *        route: '/behavioral/tell-me-about-yourself',
 *        category: 'Introduction',
 *        description: 'A 60–90 second summary of who you are, what you do, and why you are here.',
 *      }
 *   2. Create the answer page under `src/app/pages/behavioral/<slug>/` (.ts/.html/.scss).
 *   3. Register a lazy child route in `src/app/app.routes.ts` under `path: 'behavioral'`:
 *      {
 *        path: '<slug>',
 *        loadComponent: () => import('./pages/behavioral/<slug>/<slug>').then((m) => m.PageClass),
 *        title: 'Interview App | <Question Title>',
 *      }
 */
export const questions: BehavioralQuestion[] = [
  // Questions will be added here soon.
];