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
    expect(text).toContain('Visual Walkthrough');
    expect(text).toContain('How to Choose a Shard Key');
    expect(text).toContain('Twitter at 100M+ users');
    expect(fixture.nativeElement.querySelectorAll('p-card').length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelectorAll('figure.visual-figure').length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelectorAll('ul.points').length).toBeGreaterThan(0);
  });
});