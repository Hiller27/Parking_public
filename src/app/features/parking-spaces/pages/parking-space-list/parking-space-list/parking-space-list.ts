import { Component, OnInit } from '@angular/core';
import { ParkingSpace, ParkingSpaceStatus } from '../../../parking-space.models';
import { ParkingSpaceService } from '../../../parking-space.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';


@Component({
  imports: [CommonModule, FormsModule, DatePipe],
  selector: 'app-parking-space-list',
  styleUrl: './parking-space-list.css',
  templateUrl: './parking-space-list.html',
})
export class ParkingSpaceList implements OnInit {
  spaces: ParkingSpace[] = [];
  searchTerm = '';
  statusFilter = 'ALL';
  formOpen = false;
  editingId: string | null = null;
  errorMessage = '';
  successMessage = '';

  form = this.emptyForm();

  constructor(
    private parkingSpaceService: ParkingSpaceService
  ) { }

  ngOnInit(): void {
    this.loadSpaces();
  }

  private emptyForm() {
    return {
      number: '',
      zone: '',
      building: '',
      status: 'AVAILABLE' as ParkingSpaceStatus
    };
  }

  loadSpaces(): void {
    this.spaces = this.parkingSpaceService.getAll();
  }

  get filteredSpaces(): ParkingSpace[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.spaces.filter(space => {
      const matchesSearch =
        space.number.toLowerCase().includes(term) ||
        space.zone.toLowerCase().includes(term) ||
        space.building.toLowerCase().includes(term);

      const matchesStatus =
        this.statusFilter === 'ALL' ||
        space.status === this.statusFilter;

      return matchesSearch && matchesStatus;
    });
  }

  get availableCount(): number {
    return this.spaces.filter(s => s.status === 'AVAILABLE').length;
  }

  get occupiedCount(): number {
    return this.spaces.filter(s => s.status === 'OCCUPIED').length;
  }

  get reservedCount(): number {
    return this.spaces.filter(s => s.status === 'RESERVED').length;
  }

  get outOfServiceCount(): number {
    return this.spaces.filter(
      s => s.status === 'OUT_OF_SERVICE'
    ).length;
  }

  openCreateForm(): void {
    this.editingId = null;
    this.form = this.emptyForm();
    this.errorMessage = '';
    this.successMessage = '';
    this.formOpen = true;
  }

  openEditForm(space: ParkingSpace): void {
    this.editingId = space.id;
    this.form = {
      number: space.number,
      zone: space.zone,
      building: space.building,
      status: space.status
    };
    this.errorMessage = '';
    this.successMessage = '';
    this.formOpen = true;
  }

  closeForm(): void {
    this.formOpen = false;
    this.errorMessage = '';
  }

  saveSpace(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const number = this.form.number.trim();
    const zone = this.form.zone.trim();
    const building = this.form.building.trim();

    if (!number || !zone || !building) {
      this.errorMessage =
        'Completa el número, la zona y el edificio.';
      return;
    }

    try {
      if (this.editingId) {
        this.parkingSpaceService.update(this.editingId, {
          number,
          zone,
          building,
          status: this.form.status
        });
        this.successMessage =
          'Estacionamiento actualizado correctamente.';
      } else {
        this.parkingSpaceService.create({
          number,
          zone,
          building,
          status: this.form.status
        });
        this.successMessage =
          'Estacionamiento registrado correctamente.';
      }

      this.loadSpaces();
      this.formOpen = false;
    } catch (error) {
      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el estacionamiento.';
    }
  }

  changeStatus(space: ParkingSpace, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const status = select.value as ParkingSpaceStatus;

    try {
      this.parkingSpaceService.updateStatus(space.id, status);
      this.loadSpaces();
      this.successMessage = 'Estado actualizado correctamente.';
      this.errorMessage = '';
    } catch (error) {
      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar el estado.';
      select.value = space.status;
    }
  }

  deleteSpace(space: ParkingSpace): void {
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar el estacionamiento ${space.number}?`
    );

    if (!confirmed) return;

    try {
      this.parkingSpaceService.delete(space.id);
      this.loadSpaces();
      this.successMessage =
        'Estacionamiento eliminado correctamente.';
      this.errorMessage = '';
    } catch (error) {
      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar el estacionamiento.';
    }
  }

  statusLabel(status: ParkingSpaceStatus): string {
    const labels: Record<ParkingSpaceStatus, string> = {
      AVAILABLE: 'Disponible',
      OCCUPIED: 'Ocupado',
      RESERVED: 'Reservado',
      OUT_OF_SERVICE: 'Fuera de servicio'
    };

    return labels[status];
  }
}