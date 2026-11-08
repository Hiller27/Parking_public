import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KeyBoxService } from '../../../key-box.service';
import { KeyBox, KeyBoxStatus } from '../../../key-box.models';
import { DatePipe } from '@angular/common';


@Component({
  imports: [CommonModule, FormsModule, DatePipe],
  selector: 'app-key-box-list',
  styleUrl: './key-box-list.css',
  templateUrl: './key-box-list.html',
})
export class KeyBoxList implements OnInit {
  boxes: KeyBox[] = [];

  searchTerm = '';
  statusFilter = 'ALL';

  formOpen = false;
  editingId: string | null = null;
  errorMessage = '';
  successMessage = '';

  form = this.emptyForm();

  constructor(private keyBoxService: KeyBoxService) { }

  ngOnInit(): void {
    this.loadBoxes();
  }

  private emptyForm() {
    return {
      code: '',
      location: '',
      compartmentNumber: '',
      status: 'AVAILABLE' as KeyBoxStatus
    };
  }

  loadBoxes(): void {
    this.boxes = this.keyBoxService.getAll();
  }

  get filteredBoxes(): KeyBox[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.boxes.filter(box => {
      const matchesSearch =
        box.code.toLowerCase().includes(term) ||
        box.location.toLowerCase().includes(term) ||
        box.compartmentNumber.toLowerCase().includes(term);

      const matchesStatus =
        this.statusFilter === 'ALL' ||
        box.status === this.statusFilter;

      return matchesSearch && matchesStatus;
    });
  }

  get availableCount(): number {
    return this.boxes.filter(
      box => box.status === 'AVAILABLE'
    ).length;
  }

  get occupiedCount(): number {
    return this.boxes.filter(
      box => box.status === 'OCCUPIED'
    ).length;
  }

  get outOfServiceCount(): number {
    return this.boxes.filter(
      box => box.status === 'OUT_OF_SERVICE'
    ).length;
  }

  openCreateForm(): void {
    this.editingId = null;
    this.form = this.emptyForm();
    this.errorMessage = '';
    this.successMessage = '';
    this.formOpen = true;
  }

  openEditForm(box: KeyBox): void {
    this.editingId = box.id;
    this.form = {
      code: box.code,
      location: box.location,
      compartmentNumber: box.compartmentNumber,
      status: box.status
    };

    this.errorMessage = '';
    this.successMessage = '';
    this.formOpen = true;
  }

  closeForm(): void {
    this.formOpen = false;
    this.errorMessage = '';
  }

  saveBox(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const code = this.form.code.trim().toUpperCase();
    const location = this.form.location.trim();
    const compartmentNumber =
      this.form.compartmentNumber.trim();

    if (!code || !location || !compartmentNumber) {
      this.errorMessage = 'Completa todos los campos obligatorios.';
      return;
    }

    try {
      if (this.editingId) {
        this.keyBoxService.update(this.editingId, {
          code,
          location,
          compartmentNumber,
          status: this.form.status
        });

        this.successMessage = 'Caja actualizada correctamente.';
      } else {
        this.keyBoxService.create({
          code,
          location,
          compartmentNumber,
          status: this.form.status
        });

        this.successMessage = 'Caja registrada correctamente.';
      }

      this.loadBoxes();
      this.formOpen = false;
    } catch (error) {
      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la caja.';
    }
  }

  changeStatus(box: KeyBox, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const status = select.value as KeyBoxStatus;

    try {
      this.keyBoxService.updateStatus(box.id, status);
      this.loadBoxes();
      this.successMessage = 'Estado actualizado correctamente.';
      this.errorMessage = '';
    } catch (error) {
      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar el estado.';

      select.value = box.status;
    }
  }

  deleteBox(box: KeyBox): void {
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar la caja ${box.code}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      this.keyBoxService.delete(box.id);
      this.loadBoxes();
      this.successMessage = 'Caja eliminada correctamente.';
      this.errorMessage = '';
    } catch (error) {
      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar la caja.';
    }
  }

  statusLabel(status: KeyBoxStatus): string {
    const labels: Record<KeyBoxStatus, string> = {
      AVAILABLE: 'Disponible',
      OCCUPIED: 'Ocupada',
      OUT_OF_SERVICE: 'Fuera de servicio'
    };

    return labels[status];
  }
}