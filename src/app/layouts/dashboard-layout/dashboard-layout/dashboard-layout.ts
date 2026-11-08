import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLinkActive } from '@angular/router';
import { RouterLink } from '@angular/router';
import { OperationModeService } from '../../../features/settings/operation-mode.service';




@Component({
  imports: [CommonModule, RouterOutlet, RouterLinkActive, RouterLink],
  selector: 'app-dashboard-layout',
  styleUrl: './dashboard-layout.css',
  templateUrl: './dashboard-layout.html',
})
export class DashboardLayout {
  sidebarOpen = false;
  readonly modeService = inject(OperationModeService);

  closeSidebar(): void {
    this.sidebarOpen = false;
  }
}

