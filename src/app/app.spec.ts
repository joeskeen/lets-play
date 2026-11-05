import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    history.replaceState(null, '', '/');
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('creates the shell', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('starts on the landing view', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Let’s Play');
    expect(text).toContain('Host a game');
    expect(text).toContain('Join a game');
  });

  it('offers a display name input', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const input = (fixture.nativeElement as HTMLElement).querySelector(
      '#display-name',
    ) as HTMLInputElement | null;
    expect(input).toBeTruthy();
    expect(input?.value.length).toBeGreaterThan(0);
  });
});
