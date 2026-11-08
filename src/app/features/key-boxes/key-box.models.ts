
export type KeyBoxStatus =
    | 'AVAILABLE'
    | 'OCCUPIED'
    | 'OUT_OF_SERVICE';

export interface KeyBox {
    id: string;
    code: string;
    location: string;
    compartmentNumber: string;
    status: KeyBoxStatus;
    createdAt: string;
}
