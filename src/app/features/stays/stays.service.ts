
import { Injectable } from '@angular/core';
import { StorageService } from '../../core/storage/storage.service';
import { KeyBoxService } from '../key-boxes/key-box.service';
import { ParkingSpaceService } from '../parking-spaces/parking-space.service';
import { PaymentMethod, Stay } from './stay.models';
import { VehicleService } from '../vehicle/vehicle.service';
import { Vehicle } from '../vehicle/vehicle.models';
import { OperationModeService } from '../settings/operation-mode.service';
import { OperationMode } from '../settings/operation-mode.models';
import { TariffService } from '../tariff/tariff.service';
import { AssignmentService } from '../assignments/assignment.service';

@Injectable({
    providedIn: 'root'
})
export class StayService {

    private readonly storageKey = 'stays';

    constructor(
        private storage: StorageService,
        private keyBoxService: KeyBoxService,
        private parkingSpaceService: ParkingSpaceService,
        private vehicleService: VehicleService,
        private modeService: OperationModeService,
        private tariffService: TariffService,
        private assignmentService: AssignmentService
    ) { }

    getAll(): Stay[] {
        const saved = this.storage.getForMode<Stay[]>(
            this.storageKey,
            [],
            this.modeService.currentMode()
        );

        // Los registros anteriores a los dos modos se consideran residenciales.
        return saved.map(stay => ({
            ...stay,
            operationMode: stay.operationMode ?? 'RESIDENTIAL'
        }));
    }

    getActive(mode?: OperationMode): Stay[] {
        return this.getAll().filter(stay =>
            stay.status === 'ACTIVE' &&
            (!mode || stay.operationMode === mode)
        );
    }

    getById(id: string): Stay | undefined {
        return this.getAll().find(stay => stay.id === id);
    }

    registerEntry(data: {
        residentId?: string;
        vehicleId?: string;
        vehiclePlate?: string;
        vehicleBrand?: string;
        vehicleModel?: string;
        vehicleColor?: string;
        entryPersonName: string;
        entryPersonDocument: string;
        keyBoxId: string;
        parkingSpaceId: string;
    }): Stay {

        const mode = this.modeService.currentMode();

        if (
            !data.entryPersonName.trim() ||
            !data.entryPersonDocument.trim()
        ) {
            throw new Error(
                'Registra el nombre y documento de quien entrega el vehículo.'
            );
        }

        let vehicle: Vehicle | undefined;
        let plate = '';
        let ownerName = '';

        if (mode === 'RESIDENTIAL') {

            vehicle = this.vehicleService.getById(data.vehicleId ?? '');

            if (!vehicle || vehicle.status !== 'ACTIVE') {
                throw new Error('El vehículo no existe o está inactivo.');
            }

            const assignment = this.assignmentService.getCurrentForVehicle(vehicle.id);
            if (
                !data.residentId ||
                !assignment ||
                assignment.residentId !== data.residentId ||
                !assignment.keyBoxId ||
                !assignment.parkingSpaceId
            ) {
                throw new Error(
                    'El residente no tiene una asignación vigente con caja y estacionamiento.'
                );
            }

            if (
                data.keyBoxId !== assignment.keyBoxId ||
                data.parkingSpaceId !== assignment.parkingSpaceId
            ) {
                throw new Error(
                    'El ingreso debe usar la caja y el estacionamiento fijos asignados al residente.'
                );
            }

            plate = vehicle.plate;
            ownerName = vehicle.ownerName;

        } else {

            plate = (data.vehiclePlate ?? '').trim().toUpperCase();

            if (!plate) {
                throw new Error('Debes ingresar la placa del vehículo.');
            }

            if (!data.vehicleBrand?.trim() || !data.vehicleModel?.trim()) {
                throw new Error('Debes ingresar la marca y el modelo del vehículo.');
            }

            ownerName = data.entryPersonName.trim();
        }

        // No permitimos que una misma placa tenga dos ingresos activos.
        const existingStay = this.getActive().find(
            stay => stay.vehiclePlate.trim().toUpperCase() === plate
        );

        if (existingStay) {
            throw new Error('Este vehículo ya tiene un ingreso activo.');
        }

        const keyBox = this.keyBoxService.getAll().find(
            box => box.id === data.keyBoxId
        );

        if (!keyBox || keyBox.status !== 'AVAILABLE') {
            throw new Error('La caja seleccionada ya no está disponible.');
        }

        const parkingSpace = this.parkingSpaceService.getAll().find(
            space => space.id === data.parkingSpaceId
        );

        if (!parkingSpace || parkingSpace.status !== 'AVAILABLE') {
            throw new Error(
                'El estacionamiento seleccionado ya no está disponible.'
            );
        }

        const stay: Stay = {
            id: crypto.randomUUID(),
            operationMode: mode,
            vehicleId: mode === 'RESIDENTIAL' ? vehicle?.id ?? '' : '',
            vehiclePlate: plate,
            ...(mode === 'PUBLIC' ? {
                vehicleBrand: data.vehicleBrand?.trim() ?? '',
                vehicleModel: data.vehicleModel?.trim() ?? '',
                vehicleColor: data.vehicleColor?.trim() ?? ''
            } : {}),
            ownerName,
            entryPersonName: data.entryPersonName.trim(),
            entryPersonDocument: data.entryPersonDocument.trim(),
            keyBoxId: keyBox.id,
            keyBoxCode: keyBox.code,
            parkingSpaceId: parkingSpace.id,
            parkingSpaceNumber: parkingSpace.number,
            entryAt: new Date().toISOString(),
            exitAt: null,
            exitPersonName: null,
            exitPersonDocument: null,
            status: 'ACTIVE'
        };

        this.keyBoxService.updateStatus(keyBox.id, 'OCCUPIED');

        this.parkingSpaceService.updateStatus(
            parkingSpace.id,
            'OCCUPIED'
        );

        this.storage.setForMode(
            this.storageKey,
            [...this.getAll(), stay],
            this.modeService.currentMode()
        );

        return stay;
    }

    registerExit(data: {
        stayId: string;
        exitPersonName: string;
        exitPersonDocument: string;
        paymentMethod?: PaymentMethod;
    }): Stay {

        const stays = this.getAll();
        const stay = stays.find(item => item.id === data.stayId);

        if (!stay || stay.status !== 'ACTIVE') {
            throw new Error('No se encontró un ingreso activo para cerrar.');
        }

        const name = data.exitPersonName.trim();
        const document = data.exitPersonDocument.trim();

        if (!name || !document) {
            throw new Error(
                'Ingresa el nombre y documento de quien retira el vehículo.'
            );
        }

        // Validar el medio de pago en parqueadero público.
        if (
            stay.operationMode === 'PUBLIC' &&
            !['CASH', 'CARD', 'TRANSFER'].includes(data.paymentMethod ?? '')
        ) {
            throw new Error('Selecciona un medio de pago válido.');
        }

        // En residencial se verifica que sea propietario o autorizado.
        if (stay.operationMode === 'RESIDENTIAL') {

            const vehicle = this.vehicleService.getById(stay.vehicleId);

            if (!vehicle) {
                throw new Error(
                    'No se encontró el vehículo para verificar la autorización.'
                );
            }

            const normalizedDocument = document.toLowerCase();

            const isOwner =
                vehicle.ownerDocument.trim().toLowerCase() === normalizedDocument;

            const authorizedPerson = vehicle.authorizedPeople.find(
                person =>
                    person.documentNumber.trim().toLowerCase() === normalizedDocument
            );

            if (!isOwner && !authorizedPerson) {
                throw new Error(
                    'La cédula no corresponde al propietario ni a una persona autorizada.'
                );
            }
        }

        const keyBox = this.keyBoxService.getAll().find(
            box => box.id === stay.keyBoxId
        );

        const parkingSpace = this.parkingSpaceService.getAll().find(
            space => space.id === stay.parkingSpaceId
        );

        if (!keyBox || !parkingSpace) {
            throw new Error(
                'No se encontraron la caja o el estacionamiento asignados.'
            );
        }

        if (
            keyBox.status !== 'OCCUPIED' ||
            parkingSpace.status !== 'OCCUPIED'
        ) {
            throw new Error(
                'El estado de los recursos no coincide con el ingreso.'
            );
        }

        let verifiedName = name;

        if (stay.operationMode === 'RESIDENTIAL') {

            const vehicle = this.vehicleService.getById(stay.vehicleId)!;
            const normalizedDocument = document.toLowerCase();

            const isOwner =
                vehicle.ownerDocument.trim().toLowerCase() === normalizedDocument;

            const authorizedPerson = vehicle.authorizedPeople.find(
                person =>
                    person.documentNumber.trim().toLowerCase() === normalizedDocument
            );

            verifiedName = isOwner
                ? vehicle.ownerName
                : authorizedPerson!.fullName;
        }

        const exitAt = new Date().toISOString();

        // Calcular el cobro únicamente para parqueadero público.
        const charge = stay.operationMode === 'PUBLIC'
            ? this.calculatePublicCharge(stay.entryAt, exitAt)
            : {};

        // Construir el registro cerrado y guardar los datos del pago.
        const closedStay: Stay = {
            ...stay,
            ...charge,

            exitAt,
            exitPersonName: verifiedName,
            exitPersonDocument: document,
            status: 'CLOSED',

            // DATOS DEL PAGO
            paymentMethod: stay.operationMode === 'PUBLIC'
                ? data.paymentMethod
                : undefined,

            paymentStatus: stay.operationMode === 'PUBLIC'
                ? 'PAID'
                : undefined,

            paymentRecordedAt: stay.operationMode === 'PUBLIC'
                ? exitAt
                : undefined
        };

        // Liberar los recursos.
        this.keyBoxService.releaseAfterCheckout(keyBox.id);
        this.parkingSpaceService.releaseAfterCheckout(parkingSpace.id);

        // Guardar el registro actualizado en localStorage.
        this.storage.setForMode(
            this.storageKey,
            stays.map(item =>
                item.id === stay.id ? closedStay : item
            ),
            this.modeService.currentMode()
        );

        return closedStay;
    }

    private calculatePublicCharge(entryAt: string, exitAt: string): {
        chargedAmount: number;
        billedHours: number;
        durationMinutes: number;
        tariffHourlyRate: number;
        tariffDailyCap: number;
    } {

        const settings = this.tariffService.getSettings();

        if (
            settings.hourlyRate <= 0 ||
            settings.dailyCap <= 0
        ) {
            throw new Error(
                'Configura una tarifa por hora y un tope diario válidos antes de registrar salidas.'
            );
        }

        const entryTime = new Date(entryAt).getTime();
        const exitTime = new Date(exitAt).getTime();

        if (
            !Number.isFinite(entryTime) ||
            !Number.isFinite(exitTime) ||
            exitTime < entryTime
        ) {
            throw new Error('Las fechas de ingreso o salida no son válidas.');
        }

        const elapsedMilliseconds = exitTime - entryTime;
        const durationMinutes = Math.ceil(elapsedMilliseconds / 60000);

        const millisecondsPerDay = 24 * 60 * 60 * 1000;
        const millisecondsPerHour = 60 * 60 * 1000;

        let remainingTime = elapsedMilliseconds;
        let chargedAmount = 0;
        let billedHours = 0;

        while (remainingTime > 0) {

            const blockDuration = Math.min(
                remainingTime,
                millisecondsPerDay
            );

            const hoursInBlock = Math.ceil(
                blockDuration / millisecondsPerHour
            );

            const blockAmount = Math.min(
                hoursInBlock * settings.hourlyRate,
                settings.dailyCap
            );

            chargedAmount += blockAmount;
            billedHours += hoursInBlock;

            remainingTime -= blockDuration;
        }

        return {
            chargedAmount,
            billedHours,
            durationMinutes,
            tariffHourlyRate: settings.hourlyRate,
            tariffDailyCap: settings.dailyCap
        };
    }

    formatCurrency(value: number): string {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(value);
    }
}
