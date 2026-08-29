import { describe, it, expect } from 'vitest';
import { isValidCPF, maskCPF, isAdult, isValidWhatsApp, isValidEmail, maskCEP } from '@/lib/validacao';

function isoDateYearsAgo(years: number, extraDays = 0): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  d.setDate(d.getDate() + extraDays);
  return d.toISOString().split('T')[0];
}

describe('isValidCPF', () => {
  it('aceita um CPF com dígitos verificadores corretos', () => {
    expect(isValidCPF('529.982.247-25')).toBe(true);
  });

  it('rejeita um CPF com dígito verificador incorreto', () => {
    expect(isValidCPF('529.982.247-26')).toBe(false);
  });

  it('rejeita CPF com todos os dígitos iguais', () => {
    expect(isValidCPF('111.111.111-11')).toBe(false);
  });

  it('rejeita CPF com quantidade errada de dígitos', () => {
    expect(isValidCPF('123.456.789-0')).toBe(false);
  });
});

describe('maskCPF', () => {
  it('formata dígitos como 000.000.000-00', () => {
    expect(maskCPF('52998224725')).toBe('529.982.247-25');
  });
});

describe('isAdult', () => {
  it('aceita quem fez 18 anos ontem', () => {
    expect(isAdult(isoDateYearsAgo(18, -1))).toBe(true);
  });

  it('rejeita quem faz 18 anos amanhã', () => {
    expect(isAdult(isoDateYearsAgo(18, 1))).toBe(false);
  });

  it('rejeita data vazia ou inválida', () => {
    expect(isAdult('')).toBe(false);
    expect(isAdult('data-invalida')).toBe(false);
  });
});

describe('isValidWhatsApp', () => {
  it('aceita um número com DDD e 9 dígitos', () => {
    expect(isValidWhatsApp('(15) 99911-2233')).toBe(true);
  });

  it('rejeita número com todos os dígitos iguais', () => {
    expect(isValidWhatsApp('11111111111')).toBe(false);
  });

  it('rejeita número com quantidade errada de dígitos', () => {
    expect(isValidWhatsApp('1599112233')).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('aceita um e-mail bem formado', () => {
    expect(isValidEmail('candidata@exemplo.com')).toBe(true);
  });

  it('rejeita e-mail sem domínio', () => {
    expect(isValidEmail('candidata@')).toBe(false);
  });
});

describe('maskCEP', () => {
  it('formata dígitos como 00000-000', () => {
    expect(maskCEP('18000000')).toBe('18000-000');
  });
});
