import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResidentService } from '../../resident.service';
import { VehicleService } from '../../../vehicle/vehicle.service';
import { ResidentList } from './resident-list';

describe('ResidentList', () => {
  let component: ResidentList;
  let fixture: ComponentFixture<ResidentList>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ResidentList],
    }).compileComponents();

    fixture = TestBed.createComponent(ResidentList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('creates and links a vehicle with the resident details', () => {
    component.openCreateForm();
    component.addAuthorizedPerson();
    component.form = {
      fullName: 'Ana García',
      documentNumber: '12345',
      phone: '3001234567',
      apartment: '302',
      building: 'Torre 2',
      vehiclePlate: 'abc123',
      vehicleBrand: 'Toyota',
      vehicleModel: 'Corolla',
      vehicleColor: 'Gris',
      vehicleId: '',
      vehicleStatus: 'ACTIVE',
      authorizedPeople: [{
        id: 'authorized-1',
        fullName: 'Luis García',
        documentNumber: '67890',
        phone: '3007654321'
      }]
    };

    component.saveResident();

    const vehicleService = TestBed.inject(VehicleService);
    const vehicle = vehicleService.getAll()[0];

    expect(component.errorMessage).toBe('');
    expect(component.residents[0].fullName).toBe('Ana García');
    expect(vehicle).toMatchObject({
      residentId: component.residents[0].id,
      plate: 'ABC123',
      brand: 'Toyota',
      model: 'Corolla',
      color: 'Gris',
      ownerName: 'Ana García',
      ownerDocument: '12345',
      ownerPhone: '3001234567',
      authorizedPeople: [{
        id: 'authorized-1',
        fullName: 'Luis García',
        documentNumber: '67890',
        phone: '3007654321'
      }]
    });
  });

  it('loads and updates the linked vehicle from the resident editor', () => {
    const residentService = TestBed.inject(ResidentService);
    const vehicleService = TestBed.inject(VehicleService);
    const resident = residentService.create({
      fullName: 'Ana García',
      documentNumber: '12345',
      phone: '3001234567',
      apartment: '302',
      building: 'Torre 2'
    });
    vehicleService.create({
      residentId: resident.id,
      plate: 'ABC123',
      brand: 'Toyota',
      model: 'Corolla',
      color: 'Gris',
      ownerName: resident.fullName,
      ownerDocument: resident.documentNumber,
      ownerPhone: resident.phone,
      authorizedPeople: [],
      status: 'ACTIVE'
    });
    component.loadResidents();
    component.openEditForm(resident);
    component.form.vehicleColor = 'Azul';

    component.saveResident();

    expect(vehicleService.getAll()[0].color).toBe('Azul');
    expect(component.errorMessage).toBe('');
  });
});
