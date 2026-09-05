import { Routes } from '@angular/router';
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-placeholder-page',
  template: `<h1>Coming soon</h1><p>This page is a placeholder for the demo.</p>`,
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class PlaceholderPage {}

export const routes: Routes = [
  { path: 'interviews', component: PlaceholderPage },
  { path: 'candidates', component: PlaceholderPage },
  { path: 'reports', component: PlaceholderPage },
  { path: 'settings', component: PlaceholderPage },
];
