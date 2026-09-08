import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { Dialog } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { SortableColumn, SortIcon, Table } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { problems as baseProblems } from './problems.data';

export interface Problem {
  number: number;
  title: string;
  difficulty: string;
  severity: 'success' | 'warn' | 'danger' | 'info';
  pattern?: string;
  leetcodeUrl: string;
  route?: string;
  description?: string;
  approach?: string[];
  time?: string;
  space?: string;
  /** Rich HTML notes (may include <img>, lists, code). Rendered trusted in the explanation dialog. */
  notes?: string;
}

@Component({
  selector: 'app-coding',
  imports: [RouterOutlet, RouterLink, Table, SortableColumn, SortIcon, Select, Dialog, Tag],
  templateUrl: './coding.html',
  styleUrl: './coding.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class Coding {
  private readonly router = inject(Router);

  readonly problems: Problem[] = baseProblems.map((problem) =>
    problem.number === 863 ? { ...problem, route: '/coding/leet-code-863' } : problem,
  );

  private readonly sanitizer = inject(DomSanitizer);

  protected safeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  readonly patternOptions: string[] = [
    ...new Set(this.problems.map((p) => p.pattern).filter((p): p is string => !!p)),
  ].sort();

  protected readonly selectedProblem = signal<Problem | undefined>(undefined);
  protected readonly explanationVisible = signal(false);

  protected openExplanation(problem: Problem): void {
    this.selectedProblem.set(problem);
    this.explanationVisible.set(true);
  }

  protected onGlobalFilter(table: Table, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    table.filterGlobal(value, 'contains');
  }

  protected onColumnFilter(table: Table, field: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    table.filter(value, field, 'contains');
  }

  protected onPatternFilter(table: Table, event: { value: string | null | undefined }): void {
    table.filter(event.value ?? '', 'pattern', 'equals');
  }

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
