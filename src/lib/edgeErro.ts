// ─────────────────────────────────────────────────────────────────────────────
// src/lib/edgeErro.ts
// Extrai a mensagem de verdade de uma resposta de edge function.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * O `supabase.functions.invoke` devolve `error.message` como
 * "Edge Function returned a non-2xx status code" sempre que a function
 * responde 4xx — o motivo real vai no corpo, alcançável por `error.context`.
 *
 * Sem isto, as recusas que o painel de RH mais produz ("RH não pode alterar a
 * conta de outro usuário de RH", "Este e-mail já está em uso") chegariam na
 * tela como um erro genérico, e quem está usando não saberia o que corrigir.
 */
export async function edgeErro(error: unknown, data?: { error?: string } | null): Promise<string | null> {
  // Caminho feliz do 200 com `{ error }` no corpo (ex.: falha parcial do ban).
  if (data?.error) return data.error;
  if (!error) return null;

  const ctx = (error as { context?: Response }).context;
  if (ctx && typeof ctx.clone === 'function') {
    try {
      const body = await ctx.clone().json();
      if (body?.error) return String(body.error);
    } catch {
      // Corpo vazio ou não-JSON: cai na mensagem padrão do cliente.
    }
  }

  return (error as Error)?.message ?? 'Erro inesperado';
}
