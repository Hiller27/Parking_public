import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TariffSettings } from './tariff-settings';

describe('TariffSettings', () => {
  let component: TariffSettings;
  let fixture: ComponentFixture<TariffSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TariffSettings],
    }).compileComponents();

    fixture = TestBed.createComponent(TariffSettings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
