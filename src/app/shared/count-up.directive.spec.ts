import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nService } from '../core/i18n/i18n.service';
import { CountUp } from './count-up.directive';

@Component({
  imports: [CountUp],
  template: `
    <span id="money" [appCountUp]="92100" currency="EUR"></span>
    <span id="count" [appCountUp]="7"></span>
  `,
})
class Host {}

function setReducedMotion(reduce: boolean) {
  (window as unknown as { matchMedia: unknown }).matchMedia = () => ({ matches: reduce });
}

async function render() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('CountUp', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    delete (window as unknown as { matchMedia?: unknown }).matchMedia;
  });

  it('jumps straight to the formatted amount when reduced motion is preferred', async () => {
    setReducedMotion(true);
    TestBed.inject(I18nService).setLang('en');
    expect((await render()).querySelector('#money')?.textContent).toBe('€92,100');
  });

  it('formats plain counts without a currency', async () => {
    setReducedMotion(true);
    expect((await render()).querySelector('#count')?.textContent).toBe('7');
  });

  it('follows the active language', async () => {
    setReducedMotion(true);
    TestBed.inject(I18nService).setLang('fr');
    const text = (await render()).querySelector('#money')?.textContent ?? '';
    expect(text.replace(/\s/g, ' ')).toContain('92 100');
    expect(text).toContain('€');
  });

  it('never leaves the cell empty while the animation runs', async () => {
    setReducedMotion(false);
    TestBed.inject(I18nService).setLang('en');
    const text = (await render()).querySelector('#money')?.textContent;
    expect(text).toBeTruthy();
  });

  it('does not crash where matchMedia is unavailable', async () => {
    expect((await render()).querySelector('#count')?.textContent).toBeTruthy();
  });
});
