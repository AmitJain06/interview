import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NetworkFundamentals } from './network-fundamentals';

describe('NetworkFundamentals', () => {
  let fixture: ComponentFixture<NetworkFundamentals>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NetworkFundamentals, RouterTestingModule],
    }).compileComponents();
    fixture = TestBed.createComponent(NetworkFundamentals);
    fixture.detectChanges();
  });

  it('renders the Network Fundamentals page', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Network Fundamentals');
    expect(text).toContain('OSI model');
    expect(text).toContain('Internet Protocol (IP)');
    expect(text).toContain('TCP vs UDP');
    expect(text).toContain('Representational State Transfer');
    expect(text).toContain('GraphQL');
    expect(text).toContain('gRPC');
    expect(text).toContain('Server-Sent Events');
    expect(text).toContain('WebSocket');
    expect(text).toContain('WebRTC');
    expect(text).toContain('load balancing');
    expect(text).toContain('Regionalization');
    expect(text).toContain('exponential backoff');
    expect(text).toContain('circuit breakers');
    expect(fixture.nativeElement.querySelectorAll('p-card').length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelectorAll('figure.visual-figure').length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelectorAll('table.summary-table').length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelectorAll('img').length).toBeGreaterThan(0);
  });
});