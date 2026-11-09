import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TariffSettingsPage } from './tariff-settings';

describe('TariffSettingsPage', () => {
  let component: TariffSettingsPage;
  let fixture: ComponentFixture<TariffSettingsPage>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [TariffSettingsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(TariffSettingsPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
