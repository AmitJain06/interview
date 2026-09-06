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
  selector: 'app-coding',
  imports: [RouterOutlet, RouterLink, Card, Tag],
  templateUrl: './coding.html',
  styleUrl: './coding.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class Coding {
  private readonly router = inject(Router);

  readonly problems: Problem[] = [
    {
      title: 'LeetCode 863 · All Nodes Distance K in Binary Tree',
      route: '/coding/leet-code-863',
      description: 'Find every node that sits exactly K edges away from a target node.',
      difficulty: 'Medium',
      severity: 'warn',
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
    return this.router.isActive('/coding', {
      paths: 'exact',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored',
    });
  }
}
