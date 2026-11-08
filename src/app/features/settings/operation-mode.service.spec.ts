import { TestBed } from '@angular/core/testing';
import { StorageService } from '../../core/storage/storage.service';
import { KeyBoxService } from '../key-boxes/key-box.service';
import { OperationModeService } from './operation-mode.service';

describe('OperationModeService data isolation', () => {
    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [
                StorageService,
                OperationModeService,
                KeyBoxService
            ]
        });
    });

    it('keeps resources separate when switching between modes', () => {
        const modeService = TestBed.inject(OperationModeService);
        const keyBoxService = TestBed.inject(KeyBoxService);

        keyBoxService.create({
            code: 'R-1',
            location: 'Recepción residencial',
            compartmentNumber: '1',
            status: 'AVAILABLE'
        });

        modeService.changeMode('PUBLIC');
        expect(keyBoxService.getAll()).toEqual([]);

        keyBoxService.create({
            code: 'P-1',
            location: 'Recepción pública',
            compartmentNumber: '1',
            status: 'AVAILABLE'
        });

        modeService.changeMode('RESIDENTIAL');
        expect(keyBoxService.getAll().map(box => box.code)).toEqual(['R-1']);

        modeService.changeMode('PUBLIC');
        expect(keyBoxService.getAll().map(box => box.code)).toEqual(['P-1']);
    });

    it('migrates existing shared data to the saved mode and splits stay history', () => {
        localStorage.setItem('parking-demo-state', JSON.stringify({
            parkControlSettings: { operationMode: 'PUBLIC' },
            keyBoxes: [{ id: 'legacy-box', code: 'OLD' }],
            stays: [
                { id: 'residential-stay', operationMode: 'RESIDENTIAL' },
                { id: 'public-stay', operationMode: 'PUBLIC' },
                { id: 'older-stay' }
            ]
        }));

        const modeService = TestBed.inject(OperationModeService);
        const keyBoxService = TestBed.inject(KeyBoxService);
        const storage = TestBed.inject(StorageService);

        expect(modeService.currentMode()).toBe('PUBLIC');
        expect(keyBoxService.getAll()).toEqual([
            { id: 'legacy-box', code: 'OLD' }
        ]);
        expect(storage.getForMode<Array<{ id: string }>>(
            'stays',
            [],
            'PUBLIC'
        ).map(stay => stay.id)).toEqual(['public-stay']);
        expect(storage.getForMode<Array<{ id: string }>>(
            'stays',
            [],
            'RESIDENTIAL'
        ).map(stay => stay.id)).toEqual(['residential-stay', 'older-stay']);
    });
});
