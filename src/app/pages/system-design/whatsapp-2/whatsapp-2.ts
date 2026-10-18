import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';

@Component({
  selector: 'app-whatsapp-2',
  imports: [RouterLink, Card, Tag],
  templateUrl: './whatsapp-2.html',
  styleUrl: './whatsapp-2.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class Whatsapp2 {}