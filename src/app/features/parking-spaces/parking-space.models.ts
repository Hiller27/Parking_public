
export type ParkingSpaceStatus =
    | 'AVAILABLE'
    | 'OCCUPIED'
    | 'RESERVED'
    | 'OUT_OF_SERVICE';

export interface ParkingSpace {
    id: string;
    number: string;
    zone: string;
    building: string;
    status: ParkingSpaceStatus;
    createdAt: string;
}
