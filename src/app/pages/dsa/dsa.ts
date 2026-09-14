import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';

interface Algorithm {
  title: string;
  route: string;
  description: string;
  difficulty: string;
  severity: 'success' | 'warn' | 'danger';
}

@Component({
  selector: 'app-dsa',
  imports: [RouterOutlet, RouterLink, Card, Tag],
  templateUrl: './dsa.html',
  styleUrl: './dsa.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class DSA {
  private readonly router = inject(Router);

  readonly algorithms: Algorithm[] = [
    {
      title: 'Dynamic Programming (DP)',
      route: '/dsa/dynamic-programming',
      description: 'Break problems into overlapping subproblems and reuse solutions',
      difficulty: 'Hard',
      severity: 'danger',
    },
    {
      title: 'Backtracking',
      route: '/dsa/backtracking',
      description: 'Generate all solutions with CHOOSE → EXPLORE → UNDO (permutations, subsets, combinations)',
      difficulty: 'Medium',
      severity: 'warn',
    },
    // Future algorithms will be added here
  ];

  protected readonly onIndexPage = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.isIndex()),
    ),
    { initialValue: this.isIndex() },
  );

  private isIndex(): boolean {
    return this.router.isActive('/dsa', {
      paths: 'exact',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored',
    });
  }
}
