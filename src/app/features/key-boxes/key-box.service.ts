
import { Injectable } from '@angular/core';
import { StorageService } from '../../core/storage/storage.service';
import { KeyBox, KeyBoxStatus } from './key-box.models';
import { OperationModeService } from '../settings/operation-mode.service';


@Injectable({ providedIn: 'root' })
export class KeyBoxService {
    private readonly storageKey = 'keyBoxes';

    constructor(
        private storage: StorageService,
        private modeService: OperationModeService
    ) { }

    getAll(): KeyBox[] {
        return this.storage.getForMode<KeyBox[]>(
            this.storageKey,
            [],
            this.modeService.currentMode()
        );
    }

    create(data: Omit<KeyBox, 'id' | 'createdAt'>): void {
        const boxes = this.getAll();

        const code = data.code.trim().toUpperCase();

        if (boxes.some(box => box.code.toUpperCase() === code)) {
            throw new Error('Ya existe una caja con ese código.');
        }

        const newBox: KeyBox = {
            ...data,
            code,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString()
        };

        this.storage.setForMode(
            this.storageKey,
            [...boxes, newBox],
            this.modeService.currentMode()
        );
    }

    update(
        id: string,
        changes: Partial<Omit<KeyBox, 'id' | 'createdAt'>>
    ): void {
        const boxes = this.getAll();
        const current = boxes.find(box => box.id === id);

        if (!current) {
            throw new Error('No se encontró la caja seleccionada.');
        }

        const code = changes.code?.trim().toUpperCase();

        if (
            code &&
            boxes.some(box =>
                box.id !== id &&
                box.code.toUpperCase() === code
            )
        ) {
            throw new Error('Ya existe otra caja con ese código.');
        }

        const updated = boxes.map(box =>
            box.id === id
                ? { ...box, ...changes, ...(code ? { code } : {}) }
                : box
        );

        this.storage.setForMode(
            this.storageKey,
            updated,
            this.modeService.currentMode()
        );
    }

    updateStatus(id: string, status: KeyBoxStatus): void {
        const box = this.getAll().find(item => item.id === id);

        if (!box) {
            throw new Error('No se encontró la caja.');
        }

        if (box.status === 'OCCUPIED' && status !== 'OCCUPIED') {
            throw new Error(
                'No puedes liberar una caja ocupada desde este módulo. ' +
                'Registra la salida del vehículo primero.'
            );
        }

        this.update(id, { status });
    }

    delete(id: string): void {
        const boxes = this.getAll();
        const box = boxes.find(item => item.id === id);

        if (!box) {
            throw new Error('No se encontró la caja.');
        }

        if (box.status === 'OCCUPIED') {
            throw new Error('No puedes eliminar una caja ocupada.');
        }

        this.storage.setForMode(
            this.storageKey,
            boxes.filter(item => item.id !== id),
            this.modeService.currentMode()
        );
    }


    releaseAfterCheckout(id: string): void {
        const boxes = this.getAll();
        const box = boxes.find(item => item.id === id);

        if (!box || box.status !== 'OCCUPIED') {
            throw new Error(
                'La caja no existe o no está ocupada. No se puede liberar.'
            );
        }

        this.storage.setForMode(
            this.storageKey,
            boxes.map(item =>
                item.id === id
                    ? { ...item, status: 'AVAILABLE' as const }
                    : item
            ),
            this.modeService.currentMode()
        );
    }

}
