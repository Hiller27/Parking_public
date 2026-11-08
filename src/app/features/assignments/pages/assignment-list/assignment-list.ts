import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TemporaryAssignment } from '../../assignment.models';
import { Vehicle } from '../../../vehicle/vehicle.models';
import { Resident } from '../../../residents/resident.models';
import { AssignmentService } from '../../assignment.service';
import { ResidentService } from '../../../residents/resident.service';
import { VehicleService } from '../../../vehicle/vehicle.service';
import { KeyBox } from '../../../key-boxes/key-box.models';
import { ParkingSpace } from '../../../parking-spaces/parking-space.models';

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-assignment-list',
  styleUrl: './assignment-list.css',
  templateUrl: './assignment-list.html',
})
export class AssignmentList implements OnInit {
  assignments: TemporaryAssignment[] = [];
  residents: Resident[] = [];
  vehicles: Vehicle[] = [];
  keyBoxes: KeyBox[] = [];
  parkingSpaces: ParkingSpace[] = [];

  searchTerm = '';
  statusFilter = 'ALL';

  showForm = false;
  errorMessage = '';
  successMessage = '';

  form = {
    residentId: '',
    vehicleId: '',
    keyBoxId: '',
    parkingSpaceId: '',
    startDate: '',
    endDate: ''
  };

  constructor(
    private assignmentService: AssignmentService,
    private residentService: ResidentService,
    private vehicleService: VehicleService
  ) { }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.assignments = this.assignmentService.getAll()
      .sort((a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
      );

    this.residents = this.residentService.getAll()
      .filter(resident => resident.active);

    this.vehicles = this.vehicleService.getAll()
      .filter(vehicle => vehicle.status === 'ACTIVE');

    this.keyBoxes = this.assignmentService.getAvailableKeyBoxes();
    this.parkingSpaces = this.assignmentService.getAvailableParkingSpaces();
  }

  get activeCount(): number {
    return this.assignmentService.getActive().length;
  }

  get expiredCount(): number {
    return this.assignmentService.getExpired().length;
  }

  get endedCount(): number {
    return this.assignmentService.getEnded().length;
  }

  get filteredAssignments(): TemporaryAssignment[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.assignments.filter(item => {
      const matchesSearch = [
        item.residentName,
        item.residentDocument,
        item.apartment,
        item.building,
        item.vehiclePlate
      ].some(value => value.toLowerCase().includes(term));

      let currentStatus: string = item.status;

      if (item.status === 'ACTIVE' && this.assignmentService.isExpired(item)) {
        currentStatus = 'EXPIRED';
      }

      const matchesStatus =
        this.statusFilter === 'ALL' ||
        (this.statusFilter === 'EXPIRED'
          ? currentStatus === 'EXPIRED'
          : currentStatus === this.statusFilter);

      return matchesSearch && matchesStatus;
    });
  }

  openForm(): void {
    this.form = {
      residentId: '',
      vehicleId: '',
      keyBoxId: '',
      parkingSpaceId: '',
      startDate: new Date().toLocaleDateString('en-CA'),
      endDate: ''
    };

    this.errorMessage = '';
    this.successMessage = '';
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.errorMessage = '';
  }

  saveAssignment(): void {
    this.errorMessage = '';
    this.successMessage = '';

    try {
      this.assignmentService.create(this.form);

      this.successMessage = 'Asignación registrada correctamente.';
      this.loadData();
      this.closeForm();

    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No fue posible registrar la asignación.';
    }
  }

  endAssignment(item: TemporaryAssignment): void {
    if (!confirm(
      `¿Deseas finalizar la asignación del vehículo ${item.vehiclePlate}?`
    )) {
      return;
    }

    try {
      this.assignmentService.end(item.id);
      this.loadData();
      this.successMessage = 'Asignación finalizada correctamente.';
      this.errorMessage = '';

    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No fue posible finalizar la asignación.';
    }
  }

  statusLabel(item: TemporaryAssignment): string {
    if (item.status === 'ENDED') return 'Finalizada';

    return this.assignmentService.isExpired(item)
      ? 'Vencida'
      : 'Activa';
  }

  statusClass(item: TemporaryAssignment): string {
    if (item.status === 'ENDED') return 'ended';

    return this.assignmentService.isExpired(item)
      ? 'expired'
      : 'active';
  }

  get selectedResident(): Resident | undefined {
    return this.residents.find(
      resident => resident.id === this.form.residentId
    );
  }

  get residentVehicles(): Vehicle[] {
    const resident = this.selectedResident;
    if (!resident) return [];

    return this.vehicles.filter(vehicle =>
      vehicle.residentId
        ? vehicle.residentId === resident.id
        : vehicle.ownerDocument.trim() === resident.documentNumber.trim()
    );
  }

  onResidentChange(): void {
    this.form.vehicleId = '';
  }
}