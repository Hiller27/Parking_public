
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ParkingSpace } from '../../../parking-spaces/parking-space.models';
import { Stay, PaymentMethod } from '../../stay.models';
import { Vehicle } from '../../../vehicle/vehicle.models';
import { KeyBox } from '../../../key-boxes/key-box.models';
import { Resident } from '../../../residents/resident.models';

import { StayService } from '../../stays.service';
import { VehicleService } from '../../../vehicle/vehicle.service';
import { KeyBoxService } from '../../../key-boxes/key-box.service';
import { ParkingSpaceService } from '../../../parking-spaces/parking-space.service';
import { OperationModeService } from '../../../settings/operation-mode.service';
import { ResidentService } from '../../../residents/resident.service';
import { AssignmentService } from '../../../assignments/assignment.service';

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-active-stays',
  standalone: true,
  styleUrl: './active-stays.css',
  templateUrl: './active-stays.html',
})
export class ActiveStays implements OnInit {

  readonly modeService = inject(OperationModeService);

  stays: Stay[] = [];
  vehicles: Vehicle[] = [];
  residents: Resident[] = [];
  availableBoxes: KeyBox[] = [];
  availableSpaces: ParkingSpace[] = [];
  assignmentNotice = '';
  receiptModalOpen = false;
  receiptStay: Stay | null = null;

  entryFormOpen = false;
  exitFormOpen = false;
  selectedStay: Stay | null = null;

  errorMessage = '';
  successMessage = '';

  entryForm = this.emptyEntryForm();

  exitForm = {
    exitPersonName: '',
    exitPersonDocument: '',
    paymentMethod: '' as PaymentMethod | ''
  };

  constructor(
    private stayService: StayService,
    private vehicleService: VehicleService,
    private keyBoxService: KeyBoxService,
    private parkingSpaceService: ParkingSpaceService,
    private residentService: ResidentService,
    private assignmentService: AssignmentService
  ) { }

  ngOnInit(): void {
    this.loadData();
  }

  private emptyEntryForm() {
    return {
      residentId: '',
      vehicleId: '',
      vehiclePlate: '',
      vehicleBrand: '',
      vehicleModel: '',
      vehicleColor: '',
      entryPersonName: '',
      entryPersonDocument: '',
      keyBoxId: '',
      parkingSpaceId: ''
    };
  }

  loadData(): void {
    const mode = this.modeService.currentMode();

    this.stays = this.stayService.getActive(mode);

    this.vehicles = this.vehicleService.getAll()
      .filter(vehicle => vehicle.status === 'ACTIVE');

    this.residents = this.isResidential
      ? this.residentService.getAll().filter(resident => resident.active)
      : [];

    this.availableBoxes = this.keyBoxService.getAll()
      .filter(box => box.status === 'AVAILABLE');

    this.availableSpaces = this.parkingSpaceService.getAll()
      .filter(space => space.status === 'AVAILABLE');
  }

  get activeCount(): number {
    return this.stays.length;
  }

  get availableVehicleCount(): number {
    return this.vehicles.length;
  }

  get isResidential(): boolean {
    return this.modeService.isResidential();
  }

  get isPublic(): boolean {
    return this.modeService.isPublic();
  }

  get vehiclesForSelectedResident(): Vehicle[] {
    const resident = this.residents.find(
      item => item.id === this.entryForm.residentId
    );

    if (!resident) {
      return [];
    }

    return this.vehicles.filter(vehicle =>
      vehicle.residentId
        ? vehicle.residentId === resident.id
        : vehicle.ownerDocument.trim() === resident.documentNumber.trim()
    );
  }

  get selectedEntryVehicle(): Vehicle | undefined {
    return this.vehiclesForSelectedResident.find(
      vehicle => vehicle.id === this.entryForm.vehicleId
    );
  }

  get selectedAssignment() {
    const assignment = this.assignmentService.getCurrentForVehicle(
      this.entryForm.vehicleId
    );

    return assignment?.residentId === this.entryForm.residentId &&
      !!assignment.keyBoxId &&
      !!assignment.parkingSpaceId
      ? assignment
      : undefined;
  }

  onResidentSelected(residentId: string): void {
    this.assignmentNotice = '';
    const resident = this.residents.find(item => item.id === residentId);
    const residentVehicles = this.vehicles.filter(vehicle =>
      vehicle.residentId
        ? vehicle.residentId === residentId
        : resident &&
          vehicle.ownerDocument.trim() === resident.documentNumber.trim()
    );
    const vehicle = residentVehicles[0];

    this.entryForm = {
      ...this.entryForm,
      residentId,
      vehicleId: vehicle?.id ?? '',
      entryPersonName: resident?.fullName ?? '',
      entryPersonDocument: resident?.documentNumber ?? '',
      keyBoxId: '',
      parkingSpaceId: ''
    };

    this.applyResidentAssignment(vehicle?.id ?? '');
  }

  onEntryVehicleSelected(vehicleId: string): void {
    const vehicle = this.vehiclesForSelectedResident.find(
      item => item.id === vehicleId
    );
    const resident = this.residents.find(
      item => item.id === this.entryForm.residentId
    );

    this.entryForm = {
      ...this.entryForm,
      vehicleId,
      entryPersonName: vehicle?.ownerName ?? resident?.fullName ?? '',
      entryPersonDocument: vehicle?.ownerDocument ?? resident?.documentNumber ?? '',
      keyBoxId: '',
      parkingSpaceId: ''
    };

    this.applyResidentAssignment(vehicleId);
  }

  private applyResidentAssignment(vehicleId: string): void {
    const assignment = this.assignmentService.getCurrentForVehicle(vehicleId);

    if (
      assignment &&
      assignment.residentId === this.entryForm.residentId &&
      assignment.keyBoxId &&
      assignment.parkingSpaceId
    ) {
      this.entryForm.keyBoxId = assignment.keyBoxId;
      this.entryForm.parkingSpaceId = assignment.parkingSpaceId;
      this.assignmentNotice = '';
      return;
    }

    this.assignmentNotice =
      'Este residente no tiene una asignación vigente con caja y estacionamiento. Regístrala en Asignaciones para continuar.';
  }

  openEntryForm(): void {
    this.loadData();

    this.errorMessage = '';
    this.successMessage = '';
    this.assignmentNotice = '';
    this.entryForm = this.emptyEntryForm();

    if (this.isPublic && this.availableBoxes.length === 0) {
      this.errorMessage = 'No hay cajas disponibles para recibir llaves.';
      return;
    }

    if (this.isPublic && this.availableSpaces.length === 0) {
      this.errorMessage = 'No hay estacionamientos disponibles.';
      return;
    }

    if (this.isResidential && this.residents.length === 0) {
      this.errorMessage = 'No hay residentes activos registrados.';
      return;
    }

    this.entryFormOpen = true;
  }

  closeEntryForm(): void {
    this.entryFormOpen = false;
    this.errorMessage = '';
  }

  registerEntry(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const commonFieldsValid =
      !!this.entryForm.keyBoxId &&
      !!this.entryForm.parkingSpaceId &&
      !!this.entryForm.entryPersonName.trim() &&
      !!this.entryForm.entryPersonDocument.trim();

    const vehicleValid = this.isResidential
      ? !!this.entryForm.residentId && !!this.entryForm.vehicleId
      : !!this.entryForm.vehiclePlate.trim() &&
        !!this.entryForm.vehicleBrand.trim() &&
        !!this.entryForm.vehicleModel.trim();

    if (!commonFieldsValid || !vehicleValid) {
      this.errorMessage = this.isResidential
        ? 'Completa todos los campos obligatorios.'
        : 'Ingresa la placa, marca, modelo y los datos de quien entrega el vehículo.';
      return;
    }

    try {
      const stay = this.stayService.registerEntry(this.entryForm);

      this.entryFormOpen = false;

      this.successMessage =
        `Ingreso de ${stay.vehiclePlate} registrado correctamente.`;

      this.loadData();

    } catch (error) {
      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'No se pudo registrar el ingreso.';

      this.loadData();
    }
  }

  openExitForm(stay: Stay): void {
    this.selectedStay = stay;

    this.exitForm = {
      exitPersonName: '',
      exitPersonDocument: '',
      paymentMethod: ''
    };
    this.errorMessage = '';
    this.successMessage = '';
    this.exitFormOpen = true;
  }

  closeExitForm(): void {
    this.exitFormOpen = false;
    this.selectedStay = null;
    this.errorMessage = '';
  }

  registerExit(): void {
    if (!this.selectedStay) return;

    this.errorMessage = '';
    this.successMessage = '';

    if (
      !this.exitForm.exitPersonName.trim() ||
      !this.exitForm.exitPersonDocument.trim()
    ) {
      this.errorMessage =
        'Ingresa el nombre y documento de quien retira el vehículo.';
      return;
    }

    if (
      this.selectedStay.operationMode === 'PUBLIC' &&
      !this.exitForm.paymentMethod
    ) {
      this.errorMessage = 'Selecciona el medio de pago del cliente.';
      return;
    }

    try {
      const closed = this.stayService.registerExit({
        stayId: this.selectedStay.id,
        exitPersonName: this.exitForm.exitPersonName,
        exitPersonDocument: this.exitForm.exitPersonDocument,
        paymentMethod: this.selectedStay.operationMode === 'PUBLIC'
          ? this.exitForm.paymentMethod as PaymentMethod
          : undefined
      });

      this.exitFormOpen = false;
      this.selectedStay = null;

      if (closed.operationMode === 'PUBLIC') {
        this.receiptStay = closed;
        this.receiptModalOpen = true;
      } else {
        this.successMessage =
          `Salida de ${closed.vehiclePlate} registrada correctamente. Recursos liberados.`;
      }

      this.loadData();

    } catch (error) {
      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'No se pudo registrar la salida.';

      this.loadData();
    }
  }
  closeReceiptModal(): void {
    this.receiptModalOpen = false;
    this.receiptStay = null;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(value);
  }

  getReceiptDuration(stay: Stay): string {
    const minutes = stay.durationMinutes ??
      Math.max(
        0,
        Math.ceil(
          (new Date(stay.exitAt ?? '').getTime() -
            new Date(stay.entryAt).getTime()) / 60000
        )
      );

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return `${hours} horas y ${remainingMinutes} minutos`;
  }

  elapsedLabel(entryAt: string): string {
    const elapsed = Math.max(
      0,
      Date.now() - new Date(entryAt).getTime()
    );

    const totalMinutes = Math.floor(elapsed / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours} h ${minutes} min`;
    }

    return `${minutes} min`;
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
        return 'No registrado';
    }
  }
}
