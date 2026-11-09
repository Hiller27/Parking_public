export type VehicleStatus = 'ACTIVE' | 'INACTIVE';
export type ResidentVehicleType = 'CAR' | 'MOTORCYCLE';

export interface AuthorizedPerson {
    id: string;
    fullName: string;
    documentNumber: string;
    phone: string;
}

export interface ResidentVehicle {
    id: string;
    plate: string;
    vehicleType: ResidentVehicleType;
    brand: string;
    model: string;
    color: string;
    authorizedPeople: AuthorizedPerson[];
    status: VehicleStatus;
    createdAt: string;
}

export interface Resident {
    id: string;
    fullName: string;
    documentNumber: string;
    phone: string;
    apartment: string;
    building: string;
    createdAt: string;
    active: boolean;
    vehicles?: ResidentVehicle[];
}