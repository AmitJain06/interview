import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Whiteboard } from '../../../shared/components/whiteboard/whiteboard';

@Component({
  selector: 'app-system-design-round',
  imports: [Whiteboard],
  templateUrl: './system-design.html',
  styleUrl: './system-design.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class SystemDesignRound {}

