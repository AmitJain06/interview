import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';
import { ProgressBar } from 'primeng/progressbar';
import { Navbar } from './shared/components/navbar/navbar';
import { Sidebar } from './shared/components/sidebar/sidebar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Button, Card, Tag, ProgressBar, Navbar, Sidebar],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('interview-app');
  protected readonly count = signal(0);
  protected readonly progress = signal(25);
  protected readonly sidebarCollapsed = signal(false);

  increment() {
    this.count.update((c) => c + 1);
    this.progress.update((p) => Math.min(100, p + 5));
  }

  reset() {
    this.count.set(0);
    this.progress.set(0);
  }
}