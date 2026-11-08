export type AssignmentStatus = 'ACTIVE' | 'ENDED';

export interface TemporaryAssignment {
    id: string;

    residentId: string;
    residentName: string;
    residentDocument: string;
    apartment: string;
    building: string;

    vehicleId: string;
    vehiclePlate: string;

    keyBoxId?: string;
    keyBoxCode?: string;
    parkingSpaceId?: string;
    parkingSpaceNumber?: string;

    startDate: string;
    endDate: string;

    status: AssignmentStatus;
    createdAt: string;
}