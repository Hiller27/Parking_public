import { Component, inject } from '@angular/core';
import { OperationModeService } from '../operation-mode.service';
import { OperationMode } from '../operation-mode.models';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-settings-page',
  styleUrl: './settings-page.css',
  templateUrl: './settings-page.html',
})
export class SettingsPage {

  readonly modeService = inject(OperationModeService);

  changeMode(mode: OperationMode): void {
    if (this.modeService.currentMode() === mode) {
      return;
    }

    const confirmed = confirm(
      '¿Deseas cambiar el modo de funcionamiento de ParkControl? Los registros existentes no serán eliminados.'
    );

    if (confirmed) {
      this.modeService.changeMode(mode);
    }
  }
}

