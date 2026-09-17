import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';

@Component({
  selector: 'app-production-incident',
  imports: [RouterLink, Card, Tag],
  templateUrl: './production-incident.html',
  styleUrl: './production-incident.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class ProductionIncident {}