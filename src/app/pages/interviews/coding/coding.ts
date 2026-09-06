import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Card } from 'primeng/card';

@Component({
  selector: 'app-coding-round',
  imports: [Card],
  templateUrl: './coding.html',
  styleUrl: './coding.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class CodingRound {}
