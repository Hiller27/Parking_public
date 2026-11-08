
import { Injectable, signal } from '@angular/core';

type StorageScope = 'RESIDENTIAL' | 'PUBLIC';

@Injectable({
    providedIn: 'root'
})
export class StorageService {
    private readonly storageKey = 'parking-demo-state';
    private readonly modeDataKeys = [
        'residents',
        'vehicles',
        'temporaryAssignments',
        'keyBoxes',
        'parkingSpaces',
        'stays',
        'publicTariffSettings'
    ];

    private loadState(): Record<string, unknown> {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    }

    private readonly state = signal(this.loadState());

    get<T>(key: string, fallback: T): T {
        return (this.state()[key] as T) ?? fallback;
    }

    getForMode<T>(key: string, fallback: T, mode: StorageScope): T {
        return (this.state()[this.scopedKey(key, mode)] as T) ?? fallback;
    }

    set<T>(key: string, value: T): void {
        const updated = {
            ...this.state(),
            [key]: value
        };

        // Guardar primero; publicar el estado solo si funciona.
        localStorage.setItem(
            this.storageKey,
            JSON.stringify(updated)
        );

        this.state.set(updated);
    }

    setForMode<T>(key: string, value: T, mode: StorageScope): void {
        const updated = {
            ...this.state(),
            [this.scopedKey(key, mode)]: value
        };

        localStorage.setItem(this.storageKey, JSON.stringify(updated));
        this.state.set(updated);
    }

    remove(key: string): void {
        const updated = { ...this.state() };
        delete updated[key];

        localStorage.setItem(
            this.storageKey,
            JSON.stringify(updated)
        );

        this.state.set(updated);
    }

    migrateLegacyData(mode: StorageScope): void {
        const current = this.state();
        const legacyKeys = this.modeDataKeys.filter(key =>
            Object.prototype.hasOwnProperty.call(current, key)
        );

        if (legacyKeys.length === 0) {
            return;
        }

        const updated = { ...current };

        for (const key of legacyKeys) {
            const legacyValue = updated[key];
            delete updated[key];

            if (key === 'stays' && Array.isArray(legacyValue)) {
                for (const stayMode of ['RESIDENTIAL', 'PUBLIC'] as const) {
                    const scopedKey = this.scopedKey(key, stayMode);

                    if (!Object.prototype.hasOwnProperty.call(updated, scopedKey)) {
                        updated[scopedKey] = legacyValue.filter(stay =>
                            stay &&
                            typeof stay === 'object' &&
                            ('operationMode' in stay
                                ? stay.operationMode
                                : 'RESIDENTIAL') === stayMode
                        );
                    }
                }
                continue;
            }

            const scopedKey = this.scopedKey(key, mode);
            if (!Object.prototype.hasOwnProperty.call(updated, scopedKey)) {
                updated[scopedKey] = legacyValue;
            }
        }

        localStorage.setItem(this.storageKey, JSON.stringify(updated));
        this.state.set(updated);
    }

    private scopedKey(key: string, mode: StorageScope): string {
        return `${mode}:${key}`;
    }
}
