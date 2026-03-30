import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Exits } from './exits';

describe('Exits', () => {
  let component: Exits;
  let fixture: ComponentFixture<Exits>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Exits],
    }).compileComponents();

    fixture = TestBed.createComponent(Exits);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
