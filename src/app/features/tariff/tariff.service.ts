
import { Injectable } from '@angular/core';
import { StorageService } from '../../core/storage/storage.service';
import { OperationModeService } from '../settings/operation-mode.service';
import { TariffSettings } from './tariff.models';

@Injectable({
    providedIn: 'root'
})
export class TariffService {

    private readonly storageKey = 'publicTariffSettings';

    private readonly defaultSettings: TariffSettings = {
        minuteRate: 0,
        dailyCap: 0,
        monthlyRate: 0,
        currency: 'COP',
        updatedAt: null
    };

    constructor(
        private storage: StorageService,
        private modeService: OperationModeService
    ) { }

    getSettings(): TariffSettings {
        const saved = this.storage.getForMode<TariffSettings & { hourlyRate?: number }>(
            this.storageKey,
            this.defaultSettings,
            this.modeService.currentMode()
        );

        if (typeof saved.minuteRate === 'number') {
            return saved;
        }

        const settings: TariffSettings = {
            minuteRate: typeof saved.hourlyRate === 'number'
                ? Math.round((saved.hourlyRate / 60) * 100) / 100
                : 0,
            dailyCap: saved.dailyCap ?? 0,
            monthlyRate: saved.monthlyRate ?? 0,
            currency: 'COP',
            updatedAt: saved.updatedAt ?? null
        };

        this.storage.setForMode(
            this.storageKey,
            settings,
            this.modeService.currentMode()
        );

        return settings;
    }

    saveSettings(data: {
        minuteRate: number;
        dailyCap: number;
        monthlyRate: number;
    }): TariffSettings {

        const minuteRate = Number(data.minuteRate);
        const dailyCap = Number(data.dailyCap);
        const monthlyRate = Number(data.monthlyRate);

        if (
            !Number.isFinite(minuteRate) ||
            !Number.isFinite(dailyCap) ||
            !Number.isFinite(monthlyRate)
        ) {
            throw new Error('Ingresa valores numéricos válidos.');
        }

        if (minuteRate <= 0) {
            throw new Error('La tarifa por minuto debe ser mayor que cero.');
        }

        if (dailyCap <= 0) {
            throw new Error('La tarifa diaria debe ser mayor que cero.');
        }

        if (monthlyRate < 0) {
            throw new Error('La tarifa mensual no puede ser negativa.');
        }

        const settings: TariffSettings = {
            minuteRate,
            dailyCap,
            monthlyRate,
            currency: 'COP',
            updatedAt: new Date().toISOString()
        };

        this.storage.setForMode(
            this.storageKey,
            settings,
            this.modeService.currentMode()
        );

        return settings;
    }
}
