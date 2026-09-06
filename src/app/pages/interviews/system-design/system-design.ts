import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Card } from 'primeng/card';

@Component({
  selector: 'app-system-design-round',
  imports: [Card],
  templateUrl: './system-design.html',
  styleUrl: './system-design.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class SystemDesignRound {}
