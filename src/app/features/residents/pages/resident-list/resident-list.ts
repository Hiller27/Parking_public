import { Component, OnInit } from '@angular/core';
import { Resident } from '../../resident.models';
import { ResidentService } from '../../resident.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthorizedPerson, Vehicle, VehicleStatus } from '../../../vehicle/vehicle.models';
import { VehicleService } from '../../../vehicle/vehicle.service';
import { StayService } from '../../../stays/stays.service';
@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-resident-list',
  styleUrl: './resident-list.css',
  templateUrl: './resident-list.html',
})
export class ResidentList implements OnInit {
  residents: Resident[] = [];
  vehicles: Vehicle[] = [];

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
    vehicleBrand: '',
    vehicleModel: '',
    vehicleColor: '',
    vehicleStatus: 'ACTIVE' as VehicleStatus,
    authorizedPeople: [] as AuthorizedPerson[]
  };

  constructor(
    private residentService: ResidentService,
    private vehicleService: VehicleService,
    private stayService: StayService
  ) { }

  ngOnInit(): void {
    this.loadResidents();
  }

  loadResidents(): void {
    this.residents = this.residentService.getAll()
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
    this.vehicles = this.vehicleService.getAll();
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

  getVehiclesForResident(resident: Resident): Vehicle[] {
    return this.vehicles.filter(vehicle =>
      vehicle.residentId
        ? vehicle.residentId === resident.id
        : vehicle.ownerDocument.trim() === resident.documentNumber.trim()
    );
  }

  get linkedVehiclesForEditing(): Vehicle[] {
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
      if (this.editingId) {
        const currentResident = this.residentService.getById(this.editingId);
        const linkedVehicles = currentResident
          ? this.getVehiclesForResident(currentResident)
          : [];
        const linkedVehicle = linkedVehicles.find(
          vehicle => vehicle.id === this.form.vehicleId
        );
        const plate = this.form.vehiclePlate.trim().toUpperCase();
        const hasVehicleDetails = [
          this.form.vehicleBrand,
          this.form.vehicleModel,
          this.form.vehicleColor
        ].some(value => value.trim()) || this.form.authorizedPeople.length > 0;

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

          this.vehicleService.validateVehicle({
            plate: vehiclePlate,
            ownerName: this.form.fullName,
            ownerDocument: this.form.documentNumber,
            authorizedPeople: this.form.authorizedPeople
          });
        }

        this.residentService.update(this.editingId, this.residentDetails());
        const updatedResident = this.residentService.getById(this.editingId);
        if (updatedResident) {
          if (linkedVehicle) {
            this.vehicleService.update(linkedVehicle.id, {
              residentId: updatedResident.id,
              plate: plate || linkedVehicle.plate,
              brand: this.form.vehicleBrand,
              model: this.form.vehicleModel,
              color: this.form.vehicleColor,
              ownerName: updatedResident.fullName,
              ownerDocument: updatedResident.documentNumber,
              ownerPhone: updatedResident.phone,
              authorizedPeople: this.form.authorizedPeople,
              status: this.form.vehicleStatus
            });
          } else if (plate) {
            this.vehicleService.create({
              residentId: updatedResident.id,
              plate,
              brand: this.form.vehicleBrand,
              model: this.form.vehicleModel,
              color: this.form.vehicleColor,
              ownerName: updatedResident.fullName,
              ownerDocument: updatedResident.documentNumber,
              ownerPhone: updatedResident.phone,
              authorizedPeople: this.form.authorizedPeople,
              status: this.form.vehicleStatus
            });
          }
        }
        this.successMessage = 'Residente actualizado correctamente.';
      } else {
        const plate = this.form.vehiclePlate.trim().toUpperCase();
        const hasVehicleDetails = [
          this.form.vehicleBrand,
          this.form.vehicleModel,
          this.form.vehicleColor
        ].some(value => value.trim()) || this.form.authorizedPeople.length > 0;

        if (!plate && hasVehicleDetails) {
          throw new Error('Ingresa la placa para poder registrar los datos del vehículo.');
        }

        if (
          plate &&
          this.vehicles.some(vehicle => vehicle.plate.toUpperCase() === plate)
        ) {
          throw new Error('Ya existe un vehículo con esa placa.');
        }

        if (plate) {
          this.vehicleService.validateVehicle({
            plate,
            ownerName: this.form.fullName,
            ownerDocument: this.form.documentNumber,
            authorizedPeople: this.form.authorizedPeople
          });
        }

        const resident = this.residentService.create(this.residentDetails());
        if (plate) {
          this.vehicleService.create({
            residentId: resident.id,
            plate,
            brand: this.form.vehicleBrand,
            model: this.form.vehicleModel,
            color: this.form.vehicleColor,
            ownerName: resident.fullName,
            ownerDocument: resident.documentNumber,
            ownerPhone: resident.phone,
            authorizedPeople: this.form.authorizedPeople,
            status: this.form.vehicleStatus
          });
        }
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
    const vehicle = this.vehicles.find(item => item.id === this.form.vehicleId);
    if (!vehicle) {
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
      this.vehicleService.delete(vehicle.id);
      this.vehicles = this.vehicleService.getAll();
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