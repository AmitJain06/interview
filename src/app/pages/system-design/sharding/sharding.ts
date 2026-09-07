import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';

@Component({
  selector: 'app-sharding',
  imports: [RouterLink, Card, Tag],
  templateUrl: './sharding.html',
  styleUrl: './sharding.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class Sharding {}