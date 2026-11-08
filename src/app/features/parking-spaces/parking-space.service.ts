
import { Injectable } from '@angular/core';
import { StorageService } from '../../core/storage/storage.service';
import { OperationModeService } from '../settings/operation-mode.service';
import {
    ParkingSpace,
    ParkingSpaceStatus
} from './parking-space.models';

@Injectable({
    providedIn: 'root'
})
export class ParkingSpaceService {
    private readonly storageKey = 'parkingSpaces';

    constructor(
        private storage: StorageService,
        private modeService: OperationModeService
    ) { }

    getAll(): ParkingSpace[] {
        return this.storage.getForMode<ParkingSpace[]>(
            this.storageKey,
            [],
            this.modeService.currentMode()
        );
    }

    create(
        data: Omit<ParkingSpace, 'id' | 'createdAt'>
    ): void {
        const spaces = this.getAll();
        const number = data.number.trim().toUpperCase();
        const building = data.building.trim().toUpperCase();

        const duplicate = spaces.some(space =>
            space.number.toUpperCase() === number &&
            space.building.toUpperCase() === building
        );

        if (duplicate) {
            throw new Error(
                'Ya existe ese número de estacionamiento en el edificio indicado.'
            );
        }

        const newSpace: ParkingSpace = {
            ...data,
            number,
            building,
            zone: data.zone.trim(),
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString()
        };

        this.storage.setForMode(
            this.storageKey,
            [...spaces, newSpace],
            this.modeService.currentMode()
        );
    }

    update(
        id: string,
        changes: Partial<Omit<ParkingSpace, 'id' | 'createdAt'>>
    ): void {
        const spaces = this.getAll();
        const current = spaces.find(space => space.id === id);

        if (!current) {
            throw new Error('No se encontró el estacionamiento.');
        }

        if (
            current.status === 'OCCUPIED' &&
            changes.status !== undefined &&
            changes.status !== 'OCCUPIED'
        ) {
            throw new Error(
                'Registra primero la salida del vehículo para liberar el estacionamiento.'
            );
        }

        const number = changes.number?.trim().toUpperCase()
            ?? current.number;
        const building = changes.building?.trim().toUpperCase()
            ?? current.building;

        const duplicate = spaces.some(space =>
            space.id !== id &&
            space.number.toUpperCase() === number &&
            space.building.toUpperCase() === building
        );

        if (duplicate) {
            throw new Error(
                'Ya existe ese número de estacionamiento en el edificio indicado.'
            );
        }

        const updated = spaces.map(space =>
            space.id === id
                ? {
                    ...space,
                    ...changes,
                    number,
                    building,
                    zone: changes.zone?.trim() ?? space.zone
                }
                : space
        );

        this.storage.setForMode(
            this.storageKey,
            updated,
            this.modeService.currentMode()
        );
    }

    updateStatus(id: string, status: ParkingSpaceStatus): void {
        const space = this.getAll().find(item => item.id === id);

        if (!space) {
            throw new Error('No se encontró el estacionamiento.');
        }

        this.update(id, { status });
    }

    delete(id: string): void {
        const spaces = this.getAll();
        const space = spaces.find(item => item.id === id);

        if (!space) {
            throw new Error('No se encontró el estacionamiento.');
        }

        if (space.status === 'OCCUPIED') {
            throw new Error(
                'No puedes eliminar un estacionamiento ocupado.'
            );
        }

        this.storage.setForMode(
            this.storageKey,
            spaces.filter(item => item.id !== id),
            this.modeService.currentMode()
        );
    }


    releaseAfterCheckout(id: string): void {
        const spaces = this.getAll();
        const space = spaces.find(item => item.id === id);

        if (!space || space.status !== 'OCCUPIED') {
            throw new Error(
                'El estacionamiento no existe o no está ocupado. No se puede liberar.'
            );
        }

        this.storage.setForMode(
            this.storageKey,
            spaces.map(item =>
                item.id === id
                    ? { ...item, status: 'AVAILABLE' as const }
                    : item
            ),
            this.modeService.currentMode()
        );
    }

}
