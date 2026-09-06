import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Card } from 'primeng/card';

@Component({
  selector: 'app-candidates',
  imports: [Card],
  templateUrl: './candidates.html',
  styleUrl: './candidates.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class Candidates {}