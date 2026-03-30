import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Consume } from './consume';

describe('Consume', () => {
  let component: Consume;
  let fixture: ComponentFixture<Consume>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Consume],
    }).compileComponents();

    fixture = TestBed.createComponent(Consume);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
