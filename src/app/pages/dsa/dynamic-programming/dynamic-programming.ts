import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';

@Component({
  selector: 'app-dynamic-programming',
  imports: [RouterLink, Card, Tag],
  templateUrl: './dynamic-programming.html',
  styleUrl: './dynamic-programming.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class DynamicProgramming {}
