import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { Toolbar } from 'primeng/toolbar';
import { Button } from 'primeng/button';
import { Avatar } from 'primeng/avatar';

@Component({
  selector: 'app-navbar',
  imports: [Toolbar, Button, Avatar],
  templateUrl: './navbar.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './navbar.scss',
})
export class Navbar {
  readonly sidebarCollapsed = input<boolean>(false);
  readonly toggleSidebar = output<void>();
}
