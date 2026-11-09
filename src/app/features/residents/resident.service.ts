import { Injectable } from '@angular/core';
import { StorageService } from '../../core/storage/storage.service';
import { OperationModeService } from '../settings/operation-mode.service';
import { Resident, ResidentVehicle } from './resident.models';

interface LegacyVehicle {
    id: string;
    residentId?: string;
    plate: string;
    vehicleType?: ResidentVehicle['vehicleType'];
    brand?: string;
    model?: string;
    color?: string;
    authorizedPeople?: ResidentVehicle['authorizedPeople'];
    status?: ResidentVehicle['status'];
    createdAt?: string;
    ownerDocument?: string;
}

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
        const mode = this.modeService.currentMode();
        const residents = this.storage.getForMode<Resident[]>(
            this.storageKey,
            [],
            mode
        );
        const legacyVehicles = this.storage.getForMode<LegacyVehicle[]>(
            'vehicles',
            [],
            mode
        );

        if (legacyVehicles.length === 0) {
            return residents;
        }

        const migrated = residents.map(resident => ({
            ...resident,
            vehicles: [...(resident.vehicles ?? [])]
        }));
        const unlinkedVehicles: LegacyVehicle[] = [];
        let migratedAny = false;

        for (const legacyVehicle of legacyVehicles) {
            const resident = migrated.find(item =>
                legacyVehicle.residentId
                    ? item.id === legacyVehicle.residentId
                    : !!legacyVehicle.ownerDocument &&
                      this.normalizeDocument(item.documentNumber) ===
                      this.normalizeDocument(legacyVehicle.ownerDocument)
            );

            if (!resident) {
                unlinkedVehicles.push(legacyVehicle);
                continue;
            }

            if (resident.vehicles?.some(vehicle => vehicle.id === legacyVehicle.id)) {
                continue;
            }

            resident.vehicles?.push({
                id: legacyVehicle.id,
                plate: legacyVehicle.plate,
                vehicleType: legacyVehicle.vehicleType ?? 'CAR',
                brand: legacyVehicle.brand ?? '',
                model: legacyVehicle.model ?? '',
                color: legacyVehicle.color ?? '',
                authorizedPeople: legacyVehicle.authorizedPeople ?? [],
                status: legacyVehicle.status ?? 'ACTIVE',
                createdAt: legacyVehicle.createdAt ?? new Date().toISOString()
            });
            migratedAny = true;
        }

        if (migratedAny) {
            this.storage.setForMode(this.storageKey, migrated, mode);
            this.storage.setForMode('vehicles', unlinkedVehicles, mode);
        }

        return migratedAny ? migrated : residents;
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

        const vehicles = this.normalizeVehicles(data.vehicles ?? []);
        this.validateVehicles(vehicles, residents, document);

        const resident: Resident = {
            ...data,
            fullName: data.fullName.trim(),
            documentNumber: document,
            phone: data.phone.trim(),
            apartment: data.apartment.trim(),
            building: data.building.trim(),
            vehicles,
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

        const vehicles = this.normalizeVehicles(data.vehicles ?? resident.vehicles ?? []);
        this.validateVehicles(vehicles, residents, document, id);

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
                        building: data.building.trim(),
                        vehicles
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

    private normalizeVehicles(vehicles: ResidentVehicle[]): ResidentVehicle[] {
        return vehicles.map(vehicle => ({
            ...vehicle,
            plate: vehicle.plate.trim().toUpperCase(),
            vehicleType: vehicle.vehicleType ?? 'CAR',
            brand: vehicle.brand.trim(),
            model: vehicle.model.trim(),
            color: vehicle.color.trim(),
            authorizedPeople: vehicle.authorizedPeople.map(person => ({
                ...person,
                fullName: person.fullName.trim(),
                documentNumber: person.documentNumber.trim(),
                phone: person.phone.trim()
            }))
        }));
    }

    private validateVehicles(
        vehicles: ResidentVehicle[],
        residents: Resident[],
        ownerDocument: string,
        excludeResidentId?: string
    ): void {
        const plates = new Set(
            residents
                .filter(resident => resident.id !== excludeResidentId)
                .flatMap(resident => (resident.vehicles ?? []).map(vehicle =>
                    vehicle.plate.trim().toUpperCase()
                ))
        );

        for (const vehicle of vehicles) {
            if (vehicle.authorizedPeople.length > 3) {
                throw new Error('Solo puedes registrar tres personas autorizadas adicionales.');
            }

            const plate = vehicle.plate.trim().toUpperCase();
            if (!plate) {
                throw new Error('Ingresa la placa del vehículo.');
            }
            if (plates.has(plate)) {
                throw new Error('Ya existe un vehículo con esa placa.');
            }
            plates.add(plate);

            const documents = new Set([this.normalizeDocument(ownerDocument)]);

            for (const person of vehicle.authorizedPeople) {
                const document = this.normalizeDocument(person.documentNumber);
                if (!person.fullName || !document) {
                    throw new Error('Completa el nombre y la cédula de cada persona autorizada.');
                }
                if (documents.has(document)) {
                    throw new Error('No repitas la cédula del propietario o de una persona autorizada.');
                }
                documents.add(document);
            }
        }
    }

    private normalizeDocument(value: string): string {
        return value.trim().toLowerCase();
    }
}