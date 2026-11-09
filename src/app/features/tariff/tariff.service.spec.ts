import { TestBed } from '@angular/core/testing';
import { StorageService } from '../../core/storage/storage.service';
import { OperationModeService } from '../settings/operation-mode.service';
import { TariffService } from './tariff.service';

describe('TariffService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('saves and returns the per-minute rate', () => {
    const service = TestBed.inject(TariffService);
    const saved = service.saveSettings({
      minuteRate: 45,
      dailyCap: 20000,
      monthlyRate: 0
    });

    expect(saved.minuteRate).toBe(45);
    expect(service.getSettings()).toEqual(saved);
  });

  it('converts an existing hourly rate to an equivalent minute rate', () => {
    const storage = TestBed.inject(StorageService);
    const modeService = TestBed.inject(OperationModeService);
    const service = TestBed.inject(TariffService);
    modeService.changeMode('PUBLIC');
    storage.setForMode('publicTariffSettings', {
      hourlyRate: 3600,
      dailyCap: 20000,
      monthlyRate: 250000,
      currency: 'COP',
      updatedAt: '2026-01-01T00:00:00.000Z'
    }, 'PUBLIC');

    expect(service.getSettings()).toMatchObject({
      minuteRate: 60,
      dailyCap: 20000,
      monthlyRate: 250000,
      updatedAt: '2026-01-01T00:00:00.000Z'
    });
    expect(storage.getForMode('publicTariffSettings', {}, 'PUBLIC'))
      .not.toHaveProperty('hourlyRate');
  });
});
