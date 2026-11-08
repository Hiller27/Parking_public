
export interface TariffSettings {
    hourlyRate: number;
    dailyCap: number;
    monthlyRate: number;
    currency: 'COP';
    updatedAt: string | null;
}
