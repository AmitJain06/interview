import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';
import { ProgressBar } from 'primeng/progressbar';

@Component({
  selector: 'app-dashboard',
  imports: [Button, Card, Tag, ProgressBar],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class Dashboard {
  protected readonly title = signal('interview-app');
  protected readonly count = signal(0);
  protected readonly progress = signal(25);

  increment() {
    this.count.update((c) => c + 1);
    this.progress.update((p) => Math.min(100, p + 5));
  }

  reset() {
    this.count.set(0);
    this.progress.set(0);
  }
}