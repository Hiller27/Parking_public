
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

type StorageScope = 'RESIDENTIAL' | 'PUBLIC';

@Injectable({
    providedIn: 'root'
})
export class StorageService {
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
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
        if (!this.isBrowser) {
            return {};
        }

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

        this.persist(updated);

        this.state.set(updated);
    }

    setForMode<T>(key: string, value: T, mode: StorageScope): void {
        const updated = {
            ...this.state(),
            [this.scopedKey(key, mode)]: value
        };

        this.persist(updated);
        this.state.set(updated);
    }

    remove(key: string): void {
        const updated = { ...this.state() };
        delete updated[key];

        this.persist(updated);
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

        this.persist(updated);
        this.state.set(updated);
    }

    private persist(state: Record<string, unknown>): void {
        if (!this.isBrowser) {
            return;
        }

        // Guardar antes de publicar para conservar el comportamiento ante errores.
        localStorage.setItem(this.storageKey, JSON.stringify(state));
    }

    private scopedKey(key: string, mode: StorageScope): string {
        return `${mode}:${key}`;
    }
}
