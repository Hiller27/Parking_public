import { Injectable } from '@angular/core';

import { StorageService } from '../../core/storage/storage.service';
import { ResidentService } from '../residents/resident.service';


import { TemporaryAssignment } from './assignment.models';
import { VehicleService } from '../vehicle/vehicle.service';
import { OperationModeService } from '../settings/operation-mode.service';
import { KeyBoxService } from '../key-boxes/key-box.service';
import { ParkingSpaceService } from '../parking-spaces/parking-space.service';
import { KeyBox } from '../key-boxes/key-box.models';
import { ParkingSpace } from '../parking-spaces/parking-space.models';

@Injectable({
    providedIn: 'root'
})
export class AssignmentService {
    private readonly storageKey = 'temporaryAssignments';

    constructor(
        private storage: StorageService,
        private residentService: ResidentService,
        private vehicleService: VehicleService,
        private modeService: OperationModeService,
        private keyBoxService: KeyBoxService,
        private parkingSpaceService: ParkingSpaceService
    ) { }

    getAll(): TemporaryAssignment[] {
        return this.storage.getForMode<TemporaryAssignment[]>(
            this.storageKey,
            [],
            this.modeService.currentMode()
        );
    }

    getById(id: string): TemporaryAssignment | undefined {
        return this.getAll().find(item => item.id === id);
    }

    getActive(): TemporaryAssignment[] {
        return this.getAll().filter(item =>
            item.status === 'ACTIVE' &&
            !this.isExpired(item)
        );
    }

    getActiveForVehicle(vehicleId: string): TemporaryAssignment | undefined {
        return this.getActive().find(item => item.vehicleId === vehicleId);
    }

    getCurrentForVehicle(vehicleId: string): TemporaryAssignment | undefined {
        const assignment = this.getActiveForVehicle(vehicleId);
        if (!assignment) return undefined;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return this.parseDate(assignment.startDate) <= today
            ? assignment
            : undefined;
    }

    getAvailableKeyBoxes(): KeyBox[] {
        const assignedIds = new Set(
            this.getActive()
                .map(item => item.keyBoxId)
                .filter((id): id is string => !!id)
        );

        return this.keyBoxService.getAll().filter(box =>
            box.status === 'AVAILABLE' && !assignedIds.has(box.id)
        );
    }

    getAvailableParkingSpaces(): ParkingSpace[] {
        const assignedIds = new Set(
            this.getActive()
                .map(item => item.parkingSpaceId)
                .filter((id): id is string => !!id)
        );

        return this.parkingSpaceService.getAll().filter(space =>
            space.status === 'AVAILABLE' && !assignedIds.has(space.id)
        );
    }

    getExpired(): TemporaryAssignment[] {
        return this.getAll().filter(item =>
            item.status === 'ACTIVE' &&
            this.isExpired(item)
        );
    }

    getEnded(): TemporaryAssignment[] {
        return this.getAll().filter(item =>
            item.status === 'ENDED'
        );
    }

    create(data: {
        residentId: string;
        vehicleId: string;
        keyBoxId: string;
        parkingSpaceId: string;
        startDate: string;
        endDate: string;
    }): TemporaryAssignment {
        const resident = this.residentService.getById(data.residentId);
        const vehicle = this.vehicleService.getById(data.vehicleId);

        if (!resident || !resident.active) {
            throw new Error('El residente no existe o está inactivo.');
        }

        if (!vehicle || vehicle.status !== 'ACTIVE') {
            throw new Error('El vehículo no existe o está inactivo.');
        }

        if (
            vehicle.residentId
                ? vehicle.residentId !== resident.id
                : vehicle.ownerDocument.trim() !== resident.documentNumber.trim()
        ) {
            throw new Error('El vehículo seleccionado no pertenece al residente.');
        }

        if (!data.keyBoxId || !data.parkingSpaceId) {
            throw new Error('Asigna una caja y un estacionamiento al residente.');
        }

        const keyBox = this.keyBoxService.getAll().find(
            item => item.id === data.keyBoxId && item.status === 'AVAILABLE'
        );
        if (!keyBox) {
            throw new Error('La caja seleccionada no está disponible.');
        }

        const parkingSpace = this.parkingSpaceService.getAll().find(
            item => item.id === data.parkingSpaceId && item.status === 'AVAILABLE'
        );
        if (!parkingSpace) {
            throw new Error('El estacionamiento seleccionado no está disponible.');
        }

        if (!data.startDate || !data.endDate) {
            throw new Error('Debes indicar las fechas de inicio y vencimiento.');
        }

        const start = this.parseDate(data.startDate);
        const end = this.parseDate(data.endDate);

        if (end <= start) {
            throw new Error('La fecha de vencimiento debe ser posterior al inicio.');
        }

        const maximumDate = this.addMonths(start, 3);

        if (end > maximumDate) {
            throw new Error('La asignación no puede superar los 3 meses.');
        }

        const assignments = this.getAll();

        const hasOverlap = assignments.some(item =>
            item.vehicleId === data.vehicleId &&
            item.status === 'ACTIVE' &&
            !this.isExpired(item) &&
            start <= this.parseDate(item.endDate) &&
            end >= this.parseDate(item.startDate)
        );

        if (hasOverlap) {
            throw new Error(
                'Este vehículo ya tiene una asignación vigente en esas fechas.'
            );
        }

        const hasResourceConflict = assignments.some(item =>
            item.status === 'ACTIVE' &&
            !this.isExpired(item) &&
            (item.keyBoxId === keyBox.id ||
                item.parkingSpaceId === parkingSpace.id)
        );

        if (hasResourceConflict) {
            throw new Error(
                'La caja o el estacionamiento ya están asignados a otro residente.'
            );
        }

        const assignment: TemporaryAssignment = {
            id: crypto.randomUUID(),

            residentId: resident.id,
            residentName: resident.fullName,
            residentDocument: resident.documentNumber,
            apartment: resident.apartment,
            building: resident.building,

            vehicleId: vehicle.id,
            vehiclePlate: vehicle.plate,

            keyBoxId: keyBox.id,
            keyBoxCode: keyBox.code,
            parkingSpaceId: parkingSpace.id,
            parkingSpaceNumber: parkingSpace.number,

            startDate: data.startDate,
            endDate: data.endDate,

            status: 'ACTIVE',
            createdAt: new Date().toISOString()
        };

        this.storage.setForMode(
            this.storageKey,
            [...assignments, assignment],
            this.modeService.currentMode()
        );

        return assignment;
    }

    end(id: string): void {
        const assignments = this.getAll();
        const assignment = assignments.find(item => item.id === id);

        if (!assignment || assignment.status === 'ENDED') {
            throw new Error('La asignación no existe o ya fue finalizada.');
        }

        this.storage.setForMode(
            this.storageKey,
            assignments.map(item =>
                item.id === id
                    ? { ...item, status: 'ENDED' as const }
                    : item
            ),
            this.modeService.currentMode()
        );
    }

    isExpired(assignment: TemporaryAssignment): boolean {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const endDate = this.parseDate(assignment.endDate);

        return endDate < today;
    }

    private parseDate(value: string): Date {
        const [year, month, day] = value.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    private addMonths(date: Date, months: number): Date {
        const result = new Date(date);
        const originalDay = result.getDate();

        result.setDate(1);
        result.setMonth(result.getMonth() + months);

        const lastDay = new Date(
            result.getFullYear(),
            result.getMonth() + 1,
            0
        ).getDate();

        result.setDate(Math.min(originalDay, lastDay));

        return result;
    }
}