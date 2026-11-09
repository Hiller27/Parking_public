
import { Component, OnInit } from '@angular/core';
import { Stay, StayStatus, PaymentMethod } from '../../../stays/stay.models';
import { StayService } from '../../../stays/stays.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-stay-history',
  styleUrl: './stay-history.css',
  templateUrl: './stay-history.html',
})
export class StayHistory implements OnInit {
  stays: Stay[] = [];

  searchTerm = '';
  statusFilter = 'ALL';
  startDate = '';
  endDate = '';

  errorMessage = '';

  constructor(private stayService: StayService) { }

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.stays = this.stayService.getAll()
      .sort((a, b) =>
        new Date(b.entryAt).getTime() -
        new Date(a.entryAt).getTime()
      );
  }

  get filteredStays(): Stay[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.stays.filter(stay => {
      const paymentMethod = this.getPaymentMethodLabel(
        stay.paymentMethod
      );

      const matchesSearch = [
        stay.vehiclePlate,
        stay.vehicleType === 'MOTORCYCLE' ? 'moto' : 'carro',
        stay.vehicleBrand ?? '',
        stay.vehicleModel ?? '',
        stay.vehicleColor ?? '',
        stay.ownerName,
        stay.entryPersonName,
        stay.entryPersonDocument,
        stay.exitPersonName ?? '',
        stay.exitPersonDocument ?? '',
        stay.keyBoxCode,
        stay.parkingSpaceNumber,
        paymentMethod,
        stay.chargedAmount?.toString() ?? ''
      ].some(value => value.toLowerCase().includes(term));

      const matchesStatus =
        this.statusFilter === 'ALL' ||
        stay.status === this.statusFilter;

      const entryDate = new Date(stay.entryAt)
        .toLocaleDateString('en-CA');

      const matchesStart =
        !this.startDate || entryDate >= this.startDate;

      const matchesEnd =
        !this.endDate || entryDate <= this.endDate;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesStart &&
        matchesEnd
      );
    });
  }

  get activeCount(): number {
    return this.stays.filter(stay => stay.status === 'ACTIVE').length;
  }

  get closedCount(): number {
    return this.stays.filter(stay => stay.status === 'CLOSED').length;
  }

  get totalCount(): number {
    return this.stays.length;
  }

  statusLabel(status: StayStatus): string {
    return status === 'ACTIVE' ? 'Activo' : 'Cerrado';
  }

  getPaymentMethodLabel(method?: PaymentMethod): string {
    switch (method) {
      case 'CASH':
        return 'Efectivo';
      case 'CARD':
        return 'Tarjeta';
      case 'TRANSFER':
        return 'Transferencia';
      default:
        return 'No aplica';
    }
  }

  paymentStatusLabel(stay: Stay): string {
    if (stay.operationMode !== 'PUBLIC' || stay.status !== 'CLOSED') {
      return 'No aplica';
    }

    return stay.paymentStatus === 'PAID' ? 'Pagado' : 'Sin registro';
  }

  formatCurrency(value?: number): string {
    if (value === undefined || value === null) {
      return 'No aplica';
    }

    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 2
    }).format(value);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'ALL';
    this.startDate = '';
    this.endDate = '';
    this.errorMessage = '';
  }

  exportCsv(): void {
    const rows = this.filteredStays;

    if (rows.length === 0) {
      this.errorMessage = 'No hay registros para exportar.';
      return;
    }

    this.errorMessage = '';

    const headers = [
      'Placa',
      'Tipo de vehículo',
      'Marca',
      'Modelo',
      'Color',
      'Propietario o responsable de ingreso',
      'Persona que entrega',
      'Cedula de entrada',
      'Caja digital',
      'Estacionamiento',
      'Fecha de entrada',
      'Persona que retira',
      'Cedula de salida',
      'Fecha de salida',
      'Estado',
      'Valor cobrado',
      'Medio de pago',
      'Estado del pago',
      'Fecha del pago'
    ];

    const escapeCsv = (value: string | number | null | undefined): string => {
      const safe = String(value ?? '').replace(/"/g, '""');
      return `"${safe}"`;
    };

    const lines = rows.map(stay => [
      stay.vehiclePlate,
      stay.vehicleType === 'MOTORCYCLE' ? 'Moto' : 'Carro',
      stay.vehicleBrand,
      stay.vehicleModel,
      stay.vehicleColor,
      stay.ownerName,
      stay.entryPersonName,
      stay.entryPersonDocument,
      stay.keyBoxCode,
      stay.parkingSpaceNumber,
      stay.entryAt,
      stay.exitPersonName,
      stay.exitPersonDocument,
      stay.exitAt,
      this.statusLabel(stay.status),
      stay.chargedAmount,
      this.getPaymentMethodLabel(stay.paymentMethod),
      this.paymentStatusLabel(stay),
      stay.paymentRecordedAt
    ].map(escapeCsv).join(';'));

    const csv = '\uFEFF' + [
      headers.map(escapeCsv).join(';'),
      ...lines
    ].join('\r\n');

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `historial-parkcontrol-${new Date()
      .toISOString().slice(0, 10)}.csv`;

    link.click();
    URL.revokeObjectURL(url);
  }
}
