import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';

@Component({
  selector: 'app-ticketmaster',
  imports: [RouterLink, Card, Tag],
  templateUrl: './ticketmaster.html',
  styleUrl: './ticketmaster.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class Ticketmaster {}
