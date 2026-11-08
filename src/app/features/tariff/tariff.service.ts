
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
        hourlyRate: 0,
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
        return this.storage.getForMode<TariffSettings>(
            this.storageKey,
            this.defaultSettings,
            this.modeService.currentMode()
        );
    }

    saveSettings(data: {
        hourlyRate: number;
        dailyCap: number;
        monthlyRate: number;
    }): TariffSettings {

        const hourlyRate = Number(data.hourlyRate);
        const dailyCap = Number(data.dailyCap);
        const monthlyRate = Number(data.monthlyRate);

        if (
            !Number.isFinite(hourlyRate) ||
            !Number.isFinite(dailyCap) ||
            !Number.isFinite(monthlyRate)
        ) {
            throw new Error('Ingresa valores numéricos válidos.');
        }

        if (hourlyRate <= 0) {
            throw new Error('La tarifa por hora debe ser mayor que cero.');
        }

        if (dailyCap <= 0) {
            throw new Error('La tarifa diaria debe ser mayor que cero.');
        }

        if (monthlyRate < 0) {
            throw new Error('La tarifa mensual no puede ser negativa.');
        }

        const settings: TariffSettings = {
            hourlyRate,
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
