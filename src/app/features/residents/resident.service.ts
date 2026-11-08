import { Injectable } from '@angular/core';
import { StorageService } from '../../core/storage/storage.service';
import { OperationModeService } from '../settings/operation-mode.service';
import { Resident } from './resident.models';

@Injectable({
    providedIn: 'root'
})
export class ResidentService {
    private readonly storageKey = 'residents';

    constructor(
        private storage: StorageService,
        private modeService: OperationModeService
    ) { }

    getAll(): Resident[] {
        return this.storage.getForMode<Resident[]>(
            this.storageKey,
            [],
            this.modeService.currentMode()
        );
    }

    getById(id: string): Resident | undefined {
        return this.getAll().find(resident => resident.id === id);
    }

    create(data: Omit<Resident, 'id' | 'createdAt' | 'active'>): Resident {
        const residents = this.getAll();

        const document = data.documentNumber.trim();

        if (!data.fullName.trim() || !document || !data.apartment.trim()) {
            throw new Error('Completa el nombre, la cédula y el apartamento.');
        }

        if (residents.some(resident => resident.documentNumber === document)) {
            throw new Error('Ya existe un residente con esa cédula.');
        }

        const resident: Resident = {
            ...data,
            fullName: data.fullName.trim(),
            documentNumber: document,
            phone: data.phone.trim(),
            apartment: data.apartment.trim(),
            building: data.building.trim(),
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            active: true
        };

        this.storage.setForMode(
            this.storageKey,
            [...residents, resident],
            this.modeService.currentMode()
        );

        return resident;
    }

    update(id: string, data: Omit<Resident, 'id' | 'createdAt' | 'active'>): void {
        const residents = this.getAll();

        const resident = residents.find(item => item.id === id);

        if (!resident) {
            throw new Error('No se encontró el residente.');
        }

        const document = data.documentNumber.trim();

        if (residents.some(item =>
            item.id !== id && item.documentNumber === document
        )) {
            throw new Error('Esa cédula ya está registrada.');
        }

        this.storage.setForMode(
            this.storageKey,
            residents.map(item =>
                item.id === id
                    ? {
                        ...item,
                        ...data,
                        fullName: data.fullName.trim(),
                        documentNumber: document,
                        phone: data.phone.trim(),
                        apartment: data.apartment.trim(),
                        building: data.building.trim()
                    }
                    : item
            ),
            this.modeService.currentMode()
        );
    }

    toggleActive(id: string): void {
        const residents = this.getAll();

        this.storage.setForMode(
            this.storageKey,
            residents.map(item =>
                item.id === id
                    ? { ...item, active: !item.active }
                    : item
            ),
            this.modeService.currentMode()
        );
    }
}