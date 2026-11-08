import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StayHistory } from './stay-history';

describe('StayHistory', () => {
  let component: StayHistory;
  let fixture: ComponentFixture<StayHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StayHistory],
    }).compileComponents();

    fixture = TestBed.createComponent(StayHistory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
