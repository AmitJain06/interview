import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';

@Component({
  selector: 'app-major-setback',
  imports: [RouterLink, Card, Tag],
  templateUrl: './major-setback.html',
  styleUrl: './major-setback.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class MajorSetback {}