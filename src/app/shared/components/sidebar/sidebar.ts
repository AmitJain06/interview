import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

interface NavItem {
  label: string;
  icon: string;
  routerLink: string;
  badge?: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: {
    '[class.is-collapsed]': 'collapsed()',
  },
})
export class Sidebar {
  readonly collapsed = input<boolean>(false);

  readonly mainItems: NavItem[] = [
    { label: 'Dashboard', icon: 'pi pi-home', routerLink: '/' },
    { label: 'Interviews', icon: 'pi pi-calendar', routerLink: '/interviews', badge: '3' },
    { label: 'Candidates', icon: 'pi pi-users', routerLink: '/candidates' },
    { label: 'Reports', icon: 'pi pi-chart-bar', routerLink: '/reports' },
  ];

  readonly secondaryItems: NavItem[] = [
    { label: 'Settings', icon: 'pi pi-cog', routerLink: '/settings' },
  ];
}
