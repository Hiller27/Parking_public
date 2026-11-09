import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StorageService } from '../../../../core/storage/storage.service';
import { ResidentService } from '../../resident.service';
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

  it('stores vehicle and authorized-person details on the resident', () => {
    component.openCreateForm();
    component.addAuthorizedPerson();
    component.form = {
      fullName: 'Ana García',
      documentNumber: '12345',
      phone: '3001234567',
      apartment: '302',
      building: 'Torre 2',
      vehiclePlate: 'abc123',
      vehicleType: 'MOTORCYCLE',
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

    const resident = component.residents[0];
    const vehicle = resident.vehicles?.[0];

    expect(component.errorMessage).toBe('');
    expect(resident.fullName).toBe('Ana García');
    expect(vehicle).toMatchObject({
      plate: 'ABC123',
      vehicleType: 'MOTORCYCLE',
      brand: 'Toyota',
      model: 'Corolla',
      color: 'Gris',
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
    const resident = residentService.create({
      fullName: 'Ana García',
      documentNumber: '12345',
      phone: '3001234567',
      apartment: '302',
      building: 'Torre 2',
      vehicles: [{
        id: 'vehicle-1',
        plate: 'ABC123',
        vehicleType: 'CAR',
        brand: 'Toyota',
        model: 'Corolla',
        color: 'Gris',
        authorizedPeople: [],
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      }]
    });
    component.loadResidents();
    component.openEditForm(resident);
    component.form.vehicleColor = 'Azul';

    component.saveResident();

    expect(residentService.getById(resident.id)?.vehicles?.[0].color).toBe('Azul');
    expect(component.errorMessage).toBe('');
  });

  it('moves previously stored resident vehicles into the resident record', () => {
    const residentService = TestBed.inject(ResidentService);
    const storage = TestBed.inject(StorageService);
    const resident = residentService.create({
      fullName: 'Ana García',
      documentNumber: '12345',
      phone: '3001234567',
      apartment: '302',
      building: 'Torre 2'
    });

    storage.setForMode('vehicles', [{
      id: 'legacy-vehicle',
      residentId: resident.id,
      plate: 'ABC123',
      brand: 'Toyota',
      model: 'Corolla',
      color: 'Gris',
      ownerName: resident.fullName,
      ownerDocument: resident.documentNumber,
      ownerPhone: resident.phone,
      authorizedPeople: [],
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00.000Z'
    }], 'RESIDENTIAL');

    const migratedResident = residentService.getById(resident.id);

    expect(migratedResident?.vehicles).toEqual([{
      id: 'legacy-vehicle',
      vehicleType: 'CAR',
      plate: 'ABC123',
      brand: 'Toyota',
      model: 'Corolla',
      color: 'Gris',
      authorizedPeople: [],
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00.000Z'
    }]);
    expect(storage.getForMode('vehicles', [], 'RESIDENTIAL')).toEqual([]);
  });
});
