import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';

@Component({
  selector: 'app-network-fundamentals',
  imports: [RouterLink, Card, Tag],
  templateUrl: './network-fundamentals.html',
  styleUrl: './network-fundamentals.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class NetworkFundamentals {}