import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';

@Component({
  selector: 'app-uber',
  imports: [RouterLink, Card, Tag],
  templateUrl: './uber.html',
  styleUrl: './uber.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class Uber {}