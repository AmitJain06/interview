import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';

@Component({
  selector: 'app-leet-code-863',
  imports: [RouterLink, Card, Tag],
  templateUrl: './leet-code-863.html',
  styleUrl: './leet-code-863.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class LeetCode863 {}