import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';
import { ProgressBar } from 'primeng/progressbar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Button, Card, Tag, ProgressBar],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
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