import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-interviews',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './interviews.html',
  styleUrl: './interviews.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class Interviews {}