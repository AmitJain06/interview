import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Card } from 'primeng/card';

@Component({
  selector: 'app-settings',
  imports: [Card],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class Settings {}