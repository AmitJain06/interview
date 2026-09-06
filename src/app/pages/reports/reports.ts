import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Card } from 'primeng/card';

@Component({
  selector: 'app-reports',
  imports: [Card],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class Reports {}