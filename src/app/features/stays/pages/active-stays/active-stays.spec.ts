import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResidentService } from '../../../residents/resident.service';
import { VehicleService } from '../../../vehicle/vehicle.service';
import { ActiveStays } from './active-stays';
import { KeyBoxService } from '../../../key-boxes/key-box.service';
import { ParkingSpaceService } from '../../../parking-spaces/parking-space.service';
import { AssignmentService } from '../../../assignments/assignment.service';
import { StayService } from '../../stays.service';
import { OperationModeService } from '../../../settings/operation-mode.service';

describe('ActiveStays', () => {
  let component: ActiveStays;
  let fixture: ComponentFixture<ActiveStays>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ActiveStays],
    }).compileComponents();

    fixture = TestBed.createComponent(ActiveStays);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('fills resident and vehicle details when selecting a resident', () => {
    const residentService = TestBed.inject(ResidentService);
    const vehicleService = TestBed.inject(VehicleService);
    const keyBoxService = TestBed.inject(KeyBoxService);
    const parkingSpaceService = TestBed.inject(ParkingSpaceService);
    const assignmentService = TestBed.inject(AssignmentService);
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

    keyBoxService.create({
      code: 'R-1',
      location: 'Recepción',
      compartmentNumber: '1',
      status: 'AVAILABLE'
    });
    parkingSpaceService.create({
      number: '101',
      zone: 'Norte',
      building: 'Torre 2',
      status: 'AVAILABLE'
    });
    const vehicle = vehicleService.getAll()[0];
    const keyBox = keyBoxService.getAll()[0];
    const parkingSpace = parkingSpaceService.getAll()[0];
    const formatDate = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const startDate = formatDate(new Date());
    const end = new Date();
    end.setDate(end.getDate() + 20);
    assignmentService.create({
      residentId: resident.id,
      vehicleId: vehicle.id,
      keyBoxId: keyBox.id,
      parkingSpaceId: parkingSpace.id,
      startDate,
      endDate: formatDate(end)
    });

    component.loadData();
    component.onResidentSelected(resident.id);

    expect(component.entryForm).toMatchObject({
      residentId: resident.id,
      vehicleId: vehicleService.getAll()[0].id,
      entryPersonName: 'Ana García',
      entryPersonDocument: '12345',
      keyBoxId: keyBox.id,
      parkingSpaceId: parkingSpace.id
    });
    expect(component.selectedEntryVehicle?.plate).toBe('ABC123');
  });

  it('stores public vehicle and person details only in the stay history', () => {
    const modeService = TestBed.inject(OperationModeService);
    const vehicleService = TestBed.inject(VehicleService);
    const keyBoxService = TestBed.inject(KeyBoxService);
    const parkingSpaceService = TestBed.inject(ParkingSpaceService);
    const stayService = TestBed.inject(StayService);

    modeService.changeMode('PUBLIC');
    keyBoxService.create({
      code: 'P-1',
      location: 'Recepción',
      compartmentNumber: '1',
      status: 'AVAILABLE'
    });
    parkingSpaceService.create({
      number: 'P-101',
      zone: 'Norte',
      building: 'Principal',
      status: 'AVAILABLE'
    });

    const stay = stayService.registerEntry({
      vehiclePlate: 'XYZ123',
      vehicleBrand: 'Toyota',
      vehicleModel: 'Corolla',
      vehicleColor: 'Gris',
      entryPersonName: 'Carlos Pérez',
      entryPersonDocument: '98765',
      keyBoxId: keyBoxService.getAll()[0].id,
      parkingSpaceId: parkingSpaceService.getAll()[0].id
    });

    expect(vehicleService.getAll()).toEqual([]);
    expect(stayService.getById(stay.id)).toMatchObject({
      vehicleId: '',
      vehiclePlate: 'XYZ123',
      vehicleBrand: 'Toyota',
      vehicleModel: 'Corolla',
      vehicleColor: 'Gris',
      entryPersonName: 'Carlos Pérez',
      entryPersonDocument: '98765'
    });
  });
});
