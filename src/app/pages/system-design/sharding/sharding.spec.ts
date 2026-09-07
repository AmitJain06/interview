import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Sharding } from './sharding';

describe('Sharding', () => {
  let fixture: ComponentFixture<Sharding>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sharding, RouterTestingModule],
    }).compileComponents();
    fixture = TestBed.createComponent(Sharding);
    fixture.detectChanges();
  });

  it('renders the Database Sharding page', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Database Sharding');
    expect(text).toContain('v7');
    expect(fixture.nativeElement.querySelectorAll('p-card').length).toBeGreaterThan(0);
  });
});