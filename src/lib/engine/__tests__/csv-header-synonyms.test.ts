import { describe, it, expect } from 'vitest';
import {
  slotForHeader,
  normalizeHeader,
} from '@/lib/engine/csvHeaderSynonyms';

describe('csvHeaderSynonyms', () => {
  describe('slotForHeader — EN canonical tokens', () => {
    it('slotForHeader("date") → "date"', () => {
      expect(slotForHeader('date')).toBe('date');
    });
  });

  describe('slotForHeader — ES canonical tokens', () => {
    it('slotForHeader("fecha") → "date"', () => {
      expect(slotForHeader('fecha')).toBe('date');
    });
  });

  describe('slotForHeader — case-insensitive', () => {
    it('slotForHeader("DATE") → "date"', () => {
      expect(slotForHeader('DATE')).toBe('date');
    });
  });

  describe('slotForHeader — accent stripping', () => {
    it('slotForHeader("descripción") → "description"', () => {
      expect(slotForHeader('descripción')).toBe('description');
    });
  });

  describe('slotForHeader — whitespace tolerance', () => {
    it('slotForHeader("  fecha  valor  ") → "date"', () => {
      expect(slotForHeader('  fecha  valor  ')).toBe('date');
    });
  });

  describe('slotForHeader — Santander-specific', () => {
    it('slotForHeader("importe eur") → "amount"', () => {
      expect(slotForHeader('importe eur')).toBe('amount');
    });
  });

  describe('slotForHeader — unknown', () => {
    it('slotForHeader("xyz") → null', () => {
      expect(slotForHeader('xyz')).toBe(null);
    });
  });

  describe('slotForHeader — multi-word Spanish', () => {
    it('slotForHeader("fecha valor") → "date"', () => {
      expect(slotForHeader('fecha valor')).toBe('date');
    });
  });

  // ─── TRIANGULATE (T1.3) ───

  describe('TRIANGULATE — mixed case + accent', () => {
    it('slotForHeader("FECHA Operación") → "date"', () => {
      expect(slotForHeader('FECHA Operación')).toBe('date');
    });
  });

  describe('TRIANGULATE — empty string', () => {
    it('slotForHeader("") → null', () => {
      expect(slotForHeader('')).toBe(null);
    });
  });

  describe('TRIANGULATE — tab-separated whitespace', () => {
    it('slotForHeader("\\tfecha\\tvalor\\t") → "date"', () => {
      expect(slotForHeader('\tfecha\tvalor\t')).toBe('date');
    });
  });
});

describe('normalizeHeader — purity', () => {
  it('same input → same output across many invocations (no hidden state)', () => {
    const input = '  FECHA Operación  ';
    const expected = 'fecha operacion';
    for (let i = 0; i < 1000; i++) {
      expect(normalizeHeader(input)).toBe(expected);
    }
  });
});