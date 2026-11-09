
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TariffService } from '../../tariff.service';
import { TariffSettings } from '../../tariff.models';

@Component({
  selector: 'app-tariff-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tariff-settings.html',
  styleUrl: './tariff-settings.css'
})
export class TariffSettingsPage implements OnInit {

  settings: TariffSettings = {
    minuteRate: 0,
    dailyCap: 0,
    monthlyRate: 0,
    currency: 'COP',
    updatedAt: null
  };

  errorMessage = '';
  successMessage = '';

  constructor(
    private tariffService: TariffService
  ) { }

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.settings = this.tariffService.getSettings();
  }

  saveSettings(): void {
    this.errorMessage = '';
    this.successMessage = '';

    try {
      this.settings = this.tariffService.saveSettings({
        minuteRate: this.settings.minuteRate,
        dailyCap: this.settings.dailyCap,
        monthlyRate: this.settings.monthlyRate
      });

      this.successMessage = 'Las tarifas se guardaron correctamente.';

    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No se pudieron guardar las tarifas.';
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 2
    }).format(value || 0);
  }

  get dailyEquivalentMinutes(): number {
    if (!this.settings.minuteRate) return 0;
    return Math.ceil(this.settings.dailyCap / this.settings.minuteRate);
  }
}
