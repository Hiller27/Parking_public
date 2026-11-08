import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KeyBoxList } from './key-box-list';

describe('KeyBoxList', () => {
  let component: KeyBoxList;
  let fixture: ComponentFixture<KeyBoxList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KeyBoxList],
    }).compileComponents();

    fixture = TestBed.createComponent(KeyBoxList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
