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
    expect(text).toContain('Why shard?');
    expect(text).toContain('choose the shard key');
    expect(text).toContain('distribute the values');
    expect(text).toContain('celebrity problem');
    expect(text).toContain('cross-shard queries');
    expect(text).toContain('consistency');
    expect(text).toContain('When to shard');
    expect(text).toContain('4 steps to bring up sharding');
    expect(text).toContain('Twitter at 100M+ users');
    expect(fixture.nativeElement.querySelectorAll('p-card').length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelectorAll('figure.visual-figure').length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelectorAll('ul.points').length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelectorAll('ol.steps').length).toBeGreaterThan(0);
  });
});