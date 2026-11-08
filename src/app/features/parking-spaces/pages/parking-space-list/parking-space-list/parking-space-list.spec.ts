import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ParkingSpaceList } from './parking-space-list';

describe('ParkingSpaceList', () => {
  let component: ParkingSpaceList;
  let fixture: ComponentFixture<ParkingSpaceList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParkingSpaceList],
    }).compileComponents();

    fixture = TestBed.createComponent(ParkingSpaceList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
