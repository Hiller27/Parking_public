import { OperationMode } from "../settings/operation-mode.models";

export type StayStatus = 'ACTIVE' | 'CLOSED';
export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER';
export type PaymentStatus = 'PAID';
export type StayVehicleType = 'CAR' | 'MOTORCYCLE';

export interface Stay {
    id: string;
    operationMode: OperationMode;

    // Información del pago
    paymentMethod?: PaymentMethod;
    paymentStatus?: PaymentStatus;
    paymentRecordedAt?: string;

    vehicleId: string;
    vehiclePlate: string;
    vehicleType?: StayVehicleType;
    vehicleBrand?: string;
    vehicleModel?: string;
    vehicleColor?: string;
    ownerName: string;

    entryPersonName: string;
    entryPersonDocument: string;

    keyBoxId: string;
    keyBoxCode: string;

    parkingSpaceId: string;
    parkingSpaceNumber: string;

    entryAt: string;
    exitAt: string | null;

    exitPersonName: string | null;
    exitPersonDocument: string | null;

    // Información del cobro en parqueadero público.
    // Son opcionales para conservar los registros anteriores.
    chargedAmount?: number;
    billedHours?: number;
    billedMinutes?: number;
    durationMinutes?: number;
    tariffMinuteRate?: number;
    tariffHourlyRate?: number;
    tariffDailyCap?: number;

    status: StayStatus;
}