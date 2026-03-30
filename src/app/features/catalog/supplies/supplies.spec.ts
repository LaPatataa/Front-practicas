import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Supplies } from './supplies';

describe('Supplies', () => {
  let component: Supplies;
  let fixture: ComponentFixture<Supplies>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Supplies],
    }).compileComponents();

    fixture = TestBed.createComponent(Supplies);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
