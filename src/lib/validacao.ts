// ─────────────────────────────────────────────────────────────────────────────
// src/lib/validacao.ts
// Validações e máscaras usadas no formulário de captação de revendedoras
// ─────────────────────────────────────────────────────────────────────────────

export function maskCPF(value: string) {
  let v = value.replace(/\D/g, '').slice(0, 11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  return v;
}

export function isValidCPF(rawCpf: string): boolean {
  const cpf = (rawCpf || '').replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i], 10) * (10 - i);
  let check1 = 11 - (sum % 11);
  if (check1 >= 10) check1 = 0;
  if (check1 !== parseInt(cpf[9], 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i], 10) * (11 - i);
  let check2 = 11 - (sum % 11);
  if (check2 >= 10) check2 = 0;
  if (check2 !== parseInt(cpf[10], 10)) return false;

  return true;
}

export function isAdult(dateStr: string): boolean {
  if (!dateStr) return false;
  const dob = new Date(dateStr + 'T00:00:00');
  if (isNaN(dob.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 18;
}

export function isValidWhatsApp(value: string): boolean {
  const phone = (value || '').replace(/\D/g, '');
  return phone.length === 11 && !/^(\d)\1{10}$/.test(phone);
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((value || '').trim());
}

export function maskCEP(value: string) {
  let v = value.replace(/\D/g, '').slice(0, 8);
  if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
  return v;
}

export type EnderecoViaCEP = {
  rua: string;
  bairro: string;
  cidade: string;
  estado: string;
};

/** Consulta o ViaCEP e retorna o endereço, ou `null` se o CEP não existir. */
export async function fetchAddressByCEP(cep: string, signal?: AbortSignal): Promise<EnderecoViaCEP | null> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) throw new Error('CEP inválido. Confira os números digitados.');

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal });
  if (!response.ok) throw new Error('Não foi possível consultar o CEP agora.');

  const data = await response.json();
  if (data.erro) return null;

  return {
    rua: data.logradouro || '',
    bairro: data.bairro || '',
    cidade: data.localidade || '',
    estado: data.uf || '',
  };
}
