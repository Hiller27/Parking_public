
import { Injectable, computed, inject, signal } from '@angular/core';
import {
    AppSettings,
    OperationMode
} from './operation-mode.models';
import { StorageService } from '../../core/storage/storage.service';

@Injectable({
    providedIn: 'root'
})
export class OperationModeService {

    private readonly storage = inject(StorageService);

    private readonly storageKey = 'parkControlSettings';

    private readonly defaultSettings: AppSettings = {
        operationMode: 'RESIDENTIAL'
    };

    private readonly settings = signal(
        this.storage.get<AppSettings>(
            this.storageKey,
            this.defaultSettings
        )
    );

    constructor() {
        this.storage.migrateLegacyData(this.currentMode());
    }

    readonly currentMode = computed(
        () => this.settings().operationMode
    );

    readonly isResidential = computed(
        () => this.currentMode() === 'RESIDENTIAL'
    );

    readonly isPublic = computed(
        () => this.currentMode() === 'PUBLIC'
    );

    getSettings(): AppSettings {
        return this.settings();
    }

    changeMode(mode: OperationMode): void {
        const updatedSettings: AppSettings = {
            ...this.settings(),
            operationMode: mode
        };

        this.storage.set(this.storageKey, updatedSettings);
        this.settings.set(updatedSettings);
    }
}
