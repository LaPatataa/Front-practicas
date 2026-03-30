import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateVisit } from './create-visit';

describe('CreateVisit', () => {
  let component: CreateVisit;
  let fixture: ComponentFixture<CreateVisit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateVisit],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateVisit);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
