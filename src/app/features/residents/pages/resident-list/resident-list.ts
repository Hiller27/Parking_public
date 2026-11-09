import { Component, OnInit } from '@angular/core';
import { Resident } from '../../resident.models';
import { ResidentService } from '../../resident.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AuthorizedPerson,
  ResidentVehicle,
  ResidentVehicleType,
  VehicleStatus
} from '../../resident.models';
import { StayService } from '../../../stays/stays.service';
@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-resident-list',
  styleUrl: './resident-list.css',
  templateUrl: './resident-list.html',
})
export class ResidentList implements OnInit {
  residents: Resident[] = [];

  searchTerm = '';
  showForm = false;
  editingId: string | null = null;

  errorMessage = '';
  successMessage = '';

  form = {
    fullName: '',
    documentNumber: '',
    phone: '',
    apartment: '',
    building: '',
    vehicleId: '',
    vehiclePlate: '',
    vehicleType: 'CAR' as ResidentVehicleType,
    vehicleBrand: '',
    vehicleModel: '',
    vehicleColor: '',
    vehicleStatus: 'ACTIVE' as VehicleStatus,
    authorizedPeople: [] as AuthorizedPerson[]
  };

  constructor(
    private residentService: ResidentService,
    private stayService: StayService
  ) { }

  ngOnInit(): void {
    this.loadResidents();
  }

  loadResidents(): void {
    this.residents = this.residentService.getAll()
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  get vehicles(): ResidentVehicle[] {
    return this.residents.flatMap(resident => resident.vehicles ?? []);
  }

  get filteredResidents(): Resident[] {
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) return this.residents;

    return this.residents.filter(resident =>
      [
        resident.fullName,
        resident.documentNumber,
        resident.phone,
        resident.apartment,
        resident.building,
        ...this.getVehiclesForResident(resident).flatMap(vehicle => [
          vehicle.plate,
          vehicle.brand,
          vehicle.model,
          vehicle.color
        ])
      ].some(value => value.toLowerCase().includes(term))
    );
  }

  getVehiclesForResident(resident: Resident): ResidentVehicle[] {
    return resident.vehicles ?? [];
  }

  get linkedVehiclesForEditing(): ResidentVehicle[] {
    const resident = this.editingId
      ? this.residentService.getById(this.editingId)
      : undefined;
    return resident ? this.getVehiclesForResident(resident) : [];
  }

  onVehicleSelected(vehicleId: string): void {
    const vehicle = this.vehicles.find(item => item.id === vehicleId);
    if (!vehicle) {
      Object.assign(this.form, this.emptyVehicleFields());
      return;
    }

    this.form = {
      ...this.form,
      vehicleId: vehicle.id,
      vehiclePlate: vehicle.plate,
      vehicleType: vehicle.vehicleType ?? 'CAR',
      vehicleBrand: vehicle.brand,
      vehicleModel: vehicle.model,
      vehicleColor: vehicle.color,
      vehicleStatus: vehicle.status,
      authorizedPeople: vehicle.authorizedPeople.map(person => ({ ...person }))
    };
  }

  private emptyVehicleFields() {
    return {
      vehicleId: '',
      vehiclePlate: '',
      vehicleType: 'CAR' as ResidentVehicleType,
      vehicleBrand: '',
      vehicleModel: '',
      vehicleColor: '',
      vehicleStatus: 'ACTIVE' as VehicleStatus,
      authorizedPeople: [] as AuthorizedPerson[]
    };
  }

  private residentDetails() {
    return {
      fullName: this.form.fullName,
      documentNumber: this.form.documentNumber,
      phone: this.form.phone,
      apartment: this.form.apartment,
      building: this.form.building
    };
  }

  get activeCount(): number {
    return this.residents.filter(item => item.active).length;
  }

  get inactiveCount(): number {
    return this.residents.filter(item => !item.active).length;
  }

  openCreateForm(): void {
    this.resetForm();
    this.editingId = null;
    this.showForm = true;
  }

  openEditForm(resident: Resident): void {
    this.editingId = resident.id;
    const vehicle = this.getVehiclesForResident(resident)[0];

    this.form = {
      fullName: resident.fullName,
      documentNumber: resident.documentNumber,
      phone: resident.phone,
      apartment: resident.apartment,
      building: resident.building,
      vehicleId: vehicle?.id ?? '',
      vehiclePlate: vehicle?.plate ?? '',
      vehicleType: vehicle?.vehicleType ?? 'CAR',
      vehicleBrand: vehicle?.brand ?? '',
      vehicleModel: vehicle?.model ?? '',
      vehicleColor: vehicle?.color ?? '',
      vehicleStatus: vehicle?.status ?? 'ACTIVE',
      authorizedPeople: vehicle?.authorizedPeople.map(person => ({ ...person })) ?? []
    };

    this.errorMessage = '';
    this.successMessage = '';
    this.showForm = true;
  }

  saveResident(): void {
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const plate = this.form.vehiclePlate.trim().toUpperCase();
      const hasVehicleDetails = [
        this.form.vehicleBrand,
        this.form.vehicleModel,
        this.form.vehicleColor
      ].some(value => value.trim()) || this.form.authorizedPeople.length > 0;
      const currentResident = this.editingId
        ? this.residentService.getById(this.editingId)
        : undefined;
      const linkedVehicles = currentResident?.vehicles ?? [];
      const linkedVehicle = linkedVehicles.find(
        vehicle => vehicle.id === this.form.vehicleId
      );

      if (!plate && !linkedVehicle && hasVehicleDetails) {
        throw new Error('Ingresa la placa para poder registrar los datos del vehículo.');
      }

      if (plate || linkedVehicle) {
        if (!linkedVehicle && linkedVehicles.length > 0) {
          throw new Error('Este residente ya tiene un vehículo registrado.');
        }

        const vehiclePlate = plate || linkedVehicle?.plate;
        if (!vehiclePlate) {
          throw new Error('Ingresa la placa del vehículo.');
        }

        if (this.vehicles.some(vehicle =>
          vehicle.id !== linkedVehicle?.id &&
          vehicle.plate.toUpperCase() === vehiclePlate
        )) {
          throw new Error('Ya existe un vehículo con esa placa.');
        }
      }

      let vehicles = [...linkedVehicles];
      if (plate || linkedVehicle) {
        const vehicle: ResidentVehicle = {
          id: linkedVehicle?.id ?? crypto.randomUUID(),
          plate: plate || linkedVehicle!.plate,
          vehicleType: this.form.vehicleType,
          brand: this.form.vehicleBrand,
          model: this.form.vehicleModel,
          color: this.form.vehicleColor,
          authorizedPeople: this.form.authorizedPeople,
          status: this.form.vehicleStatus,
          createdAt: linkedVehicle?.createdAt ?? new Date().toISOString()
        };

        vehicles = linkedVehicle
          ? vehicles.map(item => item.id === linkedVehicle.id ? vehicle : item)
          : [...vehicles, vehicle];
      }

      if (this.editingId) {
        this.residentService.update(this.editingId, {
          ...this.residentDetails(),
          vehicles
        });
        this.successMessage = 'Residente actualizado correctamente.';
      } else {
        this.residentService.create({
          ...this.residentDetails(),
          vehicles
        });
        this.successMessage = 'Residente registrado correctamente.';
      }

      this.loadResidents();
      this.closeForm();

    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No fue posible guardar el residente.';
    }
  }

  addAuthorizedPerson(): void {
    if (this.form.authorizedPeople.length >= 3) {
      this.errorMessage = 'Solo puedes registrar tres personas autorizadas adicionales.';
      return;
    }

    this.errorMessage = '';
    this.form.authorizedPeople.push({
      id: crypto.randomUUID(),
      fullName: '',
      documentNumber: '',
      phone: ''
    });
  }

  removeAuthorizedPerson(index: number): void {
    this.form.authorizedPeople.splice(index, 1);
  }

  removeVehicle(): void {
    const resident = this.editingId
      ? this.residentService.getById(this.editingId)
      : undefined;
    const vehicle = resident?.vehicles?.find(
      item => item.id === this.form.vehicleId
    );
    if (!resident || !vehicle) {
      return;
    }

    if (this.stayService.getActive('RESIDENTIAL').some(
      stay => stay.vehicleId === vehicle.id
    )) {
      this.errorMessage = 'No puedes quitar un vehículo que tiene un ingreso activo.';
      return;
    }

    if (!confirm(`¿Deseas quitar el vehículo ${vehicle.plate} de este residente?`)) {
      return;
    }

    try {
      this.residentService.update(resident.id, {
        ...this.residentDetails(),
        vehicles: (resident.vehicles ?? []).filter(item => item.id !== vehicle.id)
      });
      this.loadResidents();
      Object.assign(this.form, this.emptyVehicleFields());
      this.errorMessage = '';
      this.successMessage = 'Vehículo retirado correctamente.';
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No fue posible quitar el vehículo.';
    }
  }

  toggleResident(resident: Resident): void {
    const action = resident.active ? 'desactivar' : 'activar';

    if (!confirm(`¿Deseas ${action} a ${resident.fullName}?`)) {
      return;
    }

    try {
      this.residentService.toggleActive(resident.id);
      this.loadResidents();
      this.successMessage = `Residente ${resident.active ? 'desactivado' : 'activado'} correctamente.`;
      this.errorMessage = '';
    } catch (error) {
      this.errorMessage = error instanceof Error
        ? error.message
        : 'No fue posible actualizar el residente.';
    }
  }

  closeForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.resetForm();
  }

  resetForm(): void {
    this.form = {
      fullName: '',
      documentNumber: '',
      phone: '',
      apartment: '',
      building: '',
      ...this.emptyVehicleFields()
    };

    this.errorMessage = '';
  }
}