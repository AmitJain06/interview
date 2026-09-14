import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';

@Component({
  selector: 'app-backtracking',
  imports: [RouterLink, Card, Tag],
  templateUrl: './backtracking.html',
  styleUrl: './backtracking.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class Backtracking {}