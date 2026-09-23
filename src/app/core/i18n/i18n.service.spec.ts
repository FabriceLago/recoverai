import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nService } from './i18n.service';
import { FR } from './fr';

describe('I18nService', () => {
  let i18n: I18nService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    i18n = TestBed.inject(I18nService);
  });

  it('returns the English key when the language is English', () => {
    i18n.setLang('en');
    expect(i18n.t('Sign in')).toBe('Sign in');
  });

  it('translates to French', () => {
    i18n.setLang('fr');
    expect(i18n.t('Sign in')).toBe('Se connecter');
  });

  it('falls back to the English key when a French entry is missing', () => {
    i18n.setLang('fr');
    expect(i18n.t('A string with no translation')).toBe('A string with no translation');
  });

  it('fills parameters in both languages', () => {
    i18n.setLang('fr');
    expect(i18n.t('Page {page} of {total}', { page: 2, total: 5 })).toBe('Page 2 sur 5');
    i18n.setLang('en');
    expect(i18n.t('Page {page} of {total}', { page: 2, total: 5 })).toBe('Page 2 of 5');
  });

  it('picks the matching locale for dates and numbers', () => {
    i18n.setLang('fr');
    expect(i18n.locale()).toBe('fr-FR');
    i18n.setLang('en');
    expect(i18n.locale()).toBe('en-US');
  });

  it('translates database-generated risk explanations, including the day count', () => {
    i18n.setLang('fr');
    expect(i18n.translateDb('18 days without contact')).toBe('18 jours sans contact');
    expect(i18n.translateDb('18 days without contact · High-value opportunity')).toBe(
      '18 jours sans contact · Opportunité à forte valeur',
    );
  });

  it('translates composed timeline labels', () => {
    i18n.setLang('fr');
    expect(i18n.translateDb('Email sent: Hello')).toBe('E-mail envoyé : Hello');
    expect(i18n.translateDb('Revenue recovered — €7,500')).toBe('Revenu récupéré — €7,500');
  });

  it('has a French entry for every enum shown to users', () => {
    for (const key of ['NEW', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST', 'DORMANT', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'URGENT']) {
      expect(FR[key], key).toBeTruthy();
    }
  });
});
