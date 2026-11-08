import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssignmentService } from '../../../assignments/assignment.service';
import { KeyBoxService } from '../../../key-boxes/key-box.service';
import { ParkingSpaceService } from '../../../parking-spaces/parking-space.service';
import { StayService } from '../../../stays/stays.service';
import { VehicleService } from '../../../vehicle/vehicle.service';
import { DashboardHome } from './dashboard-home';

describe('DashboardHome', () => {
  let component: DashboardHome;
  let fixture: ComponentFixture<DashboardHome>;
  const keyBoxes = [{ status: 'AVAILABLE' }, { status: 'OCCUPIED' }];
  const parkingSpaces = [
    { status: 'AVAILABLE' },
    { status: 'AVAILABLE' },
    { status: 'OUT_OF_SERVICE' }
  ];
  const vehicles = [{ status: 'ACTIVE' }, { status: 'INACTIVE' }];
  const activeAssignments = [{ id: 'assignment-1' }];
  const stays = [
    {
      id: 'stay-old',
      vehiclePlate: 'OLD123',
      entryPersonName: 'Persona anterior',
      entryAt: '2026-01-01T10:00:00.000Z',
      status: 'CLOSED'
    },
    {
      id: 'stay-new',
      vehiclePlate: 'NEW456',
      entryPersonName: 'Persona reciente',
      entryAt: '2026-01-02T10:00:00.000Z',
      status: 'ACTIVE'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardHome],
      providers: [
        { provide: KeyBoxService, useValue: { getAll: () => keyBoxes } },
        { provide: ParkingSpaceService, useValue: { getAll: () => parkingSpaces } },
        { provide: VehicleService, useValue: { getAll: () => vehicles } },
        { provide: AssignmentService, useValue: { getActive: () => activeAssignments } },
        { provide: StayService, useValue: { getAll: () => stays } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardHome);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows dashboard counts from the feature services', () => {
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(component.stats.map(stat => stat.value)).toEqual([1, 2, 1, 1]);
    expect(text).toContain('de 2 cajas registradas');
    expect(text).toContain('de 3 espacios registrados');
    expect(text).toContain('de 2 vehículos registrados');
    expect(text).not.toContain('Modo demostración');
  });

  it('shows recent stays in newest-first order', () => {
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(component.recentStays.map(stay => stay.id)).toEqual([
      'stay-new',
      'stay-old'
    ]);
    expect(text.indexOf('NEW456')).toBeLessThan(text.indexOf('OLD123'));
    expect(text).toContain('Persona reciente');
    expect(text).toContain('En curso');
    expect(text).toContain('Finalizada');
  });
});
