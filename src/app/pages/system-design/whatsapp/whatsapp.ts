import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';

@Component({
  selector: 'app-whatsapp',
  imports: [RouterLink, Card, Tag],
  templateUrl: './whatsapp.html',
  styleUrl: './whatsapp.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class Whatsapp {}