import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';

@Component({
  selector: 'app-permutations-backtracking',
  imports: [RouterLink, Card, Tag],
  templateUrl: './permutations-backtracking.html',
  styleUrl: './permutations-backtracking.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class PermutationsBacktracking {}