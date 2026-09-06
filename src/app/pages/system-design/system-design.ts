import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';

interface Problem {
  title: string;
  route: string;
  description: string;
  difficulty: string;
  severity: 'success' | 'warn' | 'danger';
}

@Component({
  selector: 'app-system-design',
  imports: [RouterOutlet, RouterLink, Card, Tag],
  templateUrl: './system-design.html',
  styleUrl: './system-design.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class SystemDesign {
  private readonly router = inject(Router);

  readonly problems: Problem[] = [
    {
      title: 'Top-K Elements',
      route: '/system-design/top-k',
      description: 'Continuously surface the K highest-ranked items from a large stream.',
      difficulty: 'Medium',
      severity: 'warn',
    },
    {
      title: 'Uber — Ride Hailing',
      route: '/system-design/uber',
      description: 'Match riders with nearby drivers and track rides in real time.',
      difficulty: 'Hard',
      severity: 'danger',
    },
  ];

  protected readonly onIndexPage = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.isIndex()),
    ),
    { initialValue: this.isIndex() },
  );

  private isIndex(): boolean {
    return this.router.isActive('/system-design', {
      paths: 'exact',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored',
    });
  }
}
