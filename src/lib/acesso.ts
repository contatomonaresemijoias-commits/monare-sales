// ─────────────────────────────────────────────────────────────────────────────
// src/lib/acesso.ts
// Papéis, rotas protegidas e para onde cada perfil vai ao entrar.
//
// Ponto único de verdade do front. O banco (RLS) e a edge function
// admin-manage-users repetem estas regras do lado de lá — aqui é só a
// navegação: esconder um botão não protege nada sozinho.
// ─────────────────────────────────────────────────────────────────────────────

import { PAINEL_PATH } from '@/content/landing';

/** Painel comercial: estoque, produtos, vendas, clientes, comissão. */
export const ADMIN_PATH = '/admin';

/** Painel de pessoas: captação, contratação e ativação/inativação. */
export const RH_PATH = '/rh';

export type Papel = 'administrador' | 'rh' | 'revendedora' | 'b2b';

/** Papéis do time de gestão — quem o RH não pode alterar. */
export const PAPEIS_PROTEGIDOS: Papel[] = ['administrador', 'rh'];

/**
 * Primeira tela depois do login. A ordem importa: quem acumula
 * administrador e rh cai no painel comercial, que é o mais completo, e
 * alcança o de RH pelo link do cabeçalho.
 */
export function rotaInicial(roles: string[]): string {
  if (roles.includes('administrador')) return ADMIN_PATH;
  if (roles.includes('rh')) return RH_PATH;
  return PAINEL_PATH;
}

/** Uma conta é "da gestão" quando carrega administrador ou rh. */
export function ehPapelProtegido(roles: string[]): boolean {
  return roles.some((r) => PAPEIS_PROTEGIDOS.includes(r as Papel));
}

/**
 * Posso mexer nesta conta? Espelha `bloqueioNoAlvo` da edge function.
 *
 * Uma única resposta para editar, redefinir senha, ativar/inativar e excluir:
 * o que decide não é a ação, é o alvo. Enquanto excluir era exclusivo do
 * admin, a tela mantinha duas regras quase iguais lado a lado — e duas regras
 * quase iguais divergem na primeira mudança.
 */
export function podeGerenciarConta(
  rolesDoAlvo: string[],
  { souEu, souAdmin }: { souEu: boolean; souAdmin: boolean },
): boolean {
  // A própria conta não se gerencia: seria o caminho para alguém se desativar
  // ou se excluir sem querer, e para uma RH driblar o bloqueio entre pares.
  if (souEu) return false;
  // Administrador não é alvo deste painel, nem para outro administrador.
  if (rolesDoAlvo.includes('administrador')) return false;
  // RH não alcança RH: é a regra que impede duas pessoas de RH de se
  // derrubarem. Para o admin, RH é alvo normal.
  if (!souAdmin && rolesDoAlvo.includes('rh')) return false;
  return true;
}
