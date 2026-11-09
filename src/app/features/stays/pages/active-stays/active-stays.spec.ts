import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResidentService } from '../../../residents/resident.service';
import { ActiveStays } from './active-stays';
import { KeyBoxService } from '../../../key-boxes/key-box.service';
import { ParkingSpaceService } from '../../../parking-spaces/parking-space.service';
import { AssignmentService } from '../../../assignments/assignment.service';
import { StayService } from '../../stays.service';
import { OperationModeService } from '../../../settings/operation-mode.service';
import { TariffService } from '../../../tariff/tariff.service';
import { afterEach, vi } from 'vitest';

describe('ActiveStays', () => {
  let component: ActiveStays;
  let fixture: ComponentFixture<ActiveStays>;

  afterEach(() => {
    vi.useRealTimers();
  });

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
    const keyBoxService = TestBed.inject(KeyBoxService);
    const parkingSpaceService = TestBed.inject(ParkingSpaceService);
    const assignmentService = TestBed.inject(AssignmentService);
    const resident = residentService.create({
      fullName: 'Ana García',
      documentNumber: '12345',
      phone: '3001234567',
      apartment: '302',
      building: 'Torre 2',
      vehicles: [{
        id: 'vehicle-1',
        plate: 'ABC123',
        vehicleType: 'MOTORCYCLE',
        brand: 'Toyota',
        model: 'Corolla',
        color: 'Gris',
        authorizedPeople: [],
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      }]
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
    const vehicle = resident.vehicles![0];
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
      vehicleId: vehicle.id,
      entryPersonName: 'Ana García',
      entryPersonDocument: '12345',
      keyBoxId: keyBox.id,
      parkingSpaceId: parkingSpace.id
    });
    expect(component.selectedEntryVehicle?.plate).toBe('ABC123');
    expect(component.selectedEntryVehicle?.vehicleType).toBe('MOTORCYCLE');
  });

  it('stores public vehicle and person details only in the stay history', () => {
    const modeService = TestBed.inject(OperationModeService);
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
      vehicleType: 'MOTORCYCLE',
      vehicleBrand: 'Toyota',
      vehicleModel: 'Corolla',
      vehicleColor: 'Gris',
      entryPersonName: 'Carlos Pérez',
      entryPersonDocument: '98765',
      keyBoxId: keyBoxService.getAll()[0].id,
      parkingSpaceId: parkingSpaceService.getAll()[0].id
    });

    expect(TestBed.inject(ResidentService).getAll()).toEqual([]);
    expect(stayService.getById(stay.id)).toMatchObject({
      vehicleId: '',
      vehiclePlate: 'XYZ123',
      vehicleType: 'MOTORCYCLE',
      vehicleBrand: 'Toyota',
      vehicleModel: 'Corolla',
      vehicleColor: 'Gris',
      entryPersonName: 'Carlos Pérez',
      entryPersonDocument: '98765'
    });
  });

  it('charges a public stay by each started minute and saves its vehicle type', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00.000Z'));

    const modeService = TestBed.inject(OperationModeService);
    const keyBoxService = TestBed.inject(KeyBoxService);
    const parkingSpaceService = TestBed.inject(ParkingSpaceService);
    const tariffService = TestBed.inject(TariffService);
    const stayService = TestBed.inject(StayService);
    modeService.changeMode('PUBLIC');
    tariffService.saveSettings({
      minuteRate: 10,
      dailyCap: 10000,
      monthlyRate: 0
    });
    keyBoxService.create({
      code: 'P-2',
      location: 'Recepción',
      compartmentNumber: '2',
      status: 'AVAILABLE'
    });
    parkingSpaceService.create({
      number: 'P-102',
      zone: 'Sur',
      building: 'Principal',
      status: 'AVAILABLE'
    });

    const stay = stayService.registerEntry({
      vehiclePlate: 'MOT123',
      vehicleType: 'MOTORCYCLE',
      vehicleBrand: 'Honda',
      vehicleModel: 'CB',
      entryPersonName: 'María López',
      entryPersonDocument: '12345',
      keyBoxId: keyBoxService.getAll()[0].id,
      parkingSpaceId: parkingSpaceService.getAll()[0].id
    });

    vi.advanceTimersByTime(12 * 60 * 1000 + 30 * 1000);
    const closedStay = stayService.registerExit({
      stayId: stay.id,
      exitPersonName: 'María López',
      exitPersonDocument: '12345',
      paymentMethod: 'CASH'
    });

    expect(closedStay).toMatchObject({
      vehicleType: 'MOTORCYCLE',
      durationMinutes: 13,
      billedMinutes: 13,
      tariffMinuteRate: 10,
      chargedAmount: 130
    });
  });
});
