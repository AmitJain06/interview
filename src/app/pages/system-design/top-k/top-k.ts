import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';

@Component({
  selector: 'app-top-k',
  imports: [RouterLink, Card, Tag],
  templateUrl: './top-k.html',
  styleUrl: './top-k.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class TopK {}