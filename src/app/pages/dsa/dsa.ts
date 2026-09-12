import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
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
  readonly algorithms: Algorithm[] = [
    {
      title: 'Dynamic Programming (DP)',
      route: '/dsa/dynamic-programming',
      description: 'Break problems into overlapping subproblems and reuse solutions',
      difficulty: 'Hard',
      severity: 'danger',
    },
    // Future algorithms will be added here
  ];

  protected readonly onIndexPage = true;
}
