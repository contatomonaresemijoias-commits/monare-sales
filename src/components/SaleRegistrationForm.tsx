import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatWarrantyText } from "@/lib/monare";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductInfo {
  id: string;
  nome: string;
  preco_venda: number;
  sku: string;
}

interface StockInfo {
  quantidade: number;
}

interface SaleFormData {
  sku: string;
  produto_id: string;
  nome_produto: string;
  preco_unitario: number;
  quantidade: number;
  garantia_aceita: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SaleRegistrationForm() {
  const { user } = useAuth();

  const [formData, setFormData] = useState<SaleFormData>({
    sku: "",
    produto_id: "",
    nome_produto: "",
    preco_unitario: 0,
    quantidade: 1,
    garantia_aceita: false,
  });

  const [skuStatus, setSkuStatus] = useState<
    "idle" | "loading" | "found" | "not_found" | "no_stock"
  >("idle");

  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const [errorMessage, setErrorMessage] = useState("");

  // ── 1. BUSCA DE SKU CORRIGIDA ─────────────────────────────────────────────
  //
  // FIX: A query agora faz dois passos:
  //   a) Busca o produto na tabela `produtos` pelo SKU
  //   b) Verifica se a parceira logada tem esse produto em `estoque_parceiras`
  //      com quantidade > 0
  //
  // Antes estava buscando `produtos` sem validar `estoque_parceiras`, causando
  // o lookup devolver resultado mesmo sem estoque disponível para aquela parceira.

  const lookupSKU = useCallback(
    async (sku: string) => {
      if (!sku || sku.trim().length < 3) {
        setSkuStatus("idle");
        setFormData((prev) => ({
          ...prev,
          produto_id: "",
          nome_produto: "",
          preco_unitario: 0,
        }));
        return;
      }

      if (!user?.id) return;

      setSkuStatus("loading");

      try {
        // Passo A: produto existe?
        const { data: produto, error: produtoError } = await supabase
          .from("produtos")
          .select("id, nome, preco_venda, sku")
          .eq("sku", sku.trim().toUpperCase())
          .maybeSingle(); // maybeSingle() → null se não achar, sem erro

        if (produtoError) throw produtoError;

        if (!produto) {
          setSkuStatus("not_found");
          setFormData((prev) => ({
            ...prev,
            produto_id: "",
            nome_produto: "",
            preco_unitario: 0,
          }));
          return;
        }

        // Passo B: a parceira tem estoque desse produto?
        const { data: estoque, error: estoqueError } = await supabase
          .from("estoque_parceiras")
          .select("quantidade")
          .eq("parceira_id", user.id)
          .eq("produto_id", produto.id)
          .maybeSingle();

        if (estoqueError) throw estoqueError;

        const temEstoque =
          estoque && (estoque as StockInfo).quantidade > 0;

        if (!temEstoque) {
          setSkuStatus("no_stock");
          setFormData((prev) => ({
            ...prev,
            produto_id: "",
            nome_produto: "",
            preco_unitario: 0,
          }));
          return;
        }

        // Produto encontrado e com estoque ✓
        setSkuStatus("found");
        setFormData((prev) => ({
          ...prev,
          produto_id: (produto as ProductInfo).id,
          nome_produto: (produto as ProductInfo).nome,
          preco_unitario: (produto as ProductInfo).preco_venda,
        }));
      } catch (err) {
        console.error("[lookupSKU] Erro:", err);
        setSkuStatus("not_found");
      }
    },
    [user?.id]
  );

  // ── 2. SUBMIT COM FIX DO 403 ──────────────────────────────────────────────
  //
  // FIX DO 403:
  //   O Supabase JS por padrão tenta fazer SELECT da linha após INSERT (RETURNING *).
  //   Se a RLS policy de SELECT não cobrir a própria linha recém-inserida pelo user,
  //   o banco retorna 403 no SELECT implícito — mesmo que o INSERT tenha passado.
  //
  //   SOLUÇÃO: Encadear `.select("id")` explicitamente e garantir que a policy
  //   de SELECT na tabela `vendas` seja:
  //
  //     CREATE POLICY "parceiras_select_own_vendas"
  //     ON vendas FOR SELECT
  //     USING (parceira_id = auth.uid());
  //
  //   E a policy de INSERT:
  //
  //     CREATE POLICY "parceiras_insert_vendas"
  //     ON vendas FOR INSERT
  //     WITH CHECK (parceira_id = auth.uid());
  //
  //   O código abaixo usa `.select("id")` para ser explícito e evitar o
  //   SELECT * implícito que causava o conflito.

  const handleSubmit = async () => {
    if (!user?.id) return;
    if (!formData.produto_id) {
      setErrorMessage("Busque um SKU válido antes de registrar.");
      return;
    }
    if (!formData.garantia_aceita) {
      setErrorMessage("É necessário aceitar o termo de garantia.");
      return;
    }

    setSubmitStatus("loading");
    setErrorMessage("");

    try {
      const codigo_garantia = `MNR-${Date.now().toString(36).toUpperCase()}`;
      const hoje = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from("vendas")
        .insert({
          parceira_id: profile?.parceira_id ?? null,
          produto_id: formData.produto_id,
          produto_nome: formData.nome_produto,
          cliente_nome: 'Cliente',
          cliente_whatsapp: '00000000000',
          data_venda: hoje,
          codigo_garantia,
          termo_aceito: formData.garantia_aceita,
          valor_venda: formData.quantidade * formData.preco_unitario,
        })
        .select("id");

      if (error) throw error;

      setSubmitStatus("success");

      // Reset form
      setFormData({
        sku: "",
        produto_id: "",
        nome_produto: "",
        preco_unitario: 0,
        quantidade: 1,
        garantia_aceita: false,
      });
      setSkuStatus("idle");
    } catch (err: any) {
      console.error("[handleSubmit] Erro ao registrar venda:", err);
      setSubmitStatus("error");

      // Mensagem amigável baseada no código do erro
      if (err?.code === "42501" || err?.status === 403) {
        setErrorMessage(
          "Permissão negada. Verifique as políticas de RLS no Supabase (ver comentário no código)."
        );
      } else {
        setErrorMessage(err?.message || "Erro ao registrar venda.");
      }
    }
  };

  // ── 3. RENDER ─────────────────────────────────────────────────────────────

  const valorTotal = formData.quantidade * formData.preco_unitario;

  return (
    <div className="min-h-screen bg-[#FAF9F7] font-['Cormorant_Garamond',serif] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="mb-10 text-center">
          <p className="text-xs tracking-[0.3em] text-[#9B8E7E] uppercase mb-2">
            Monarê Semijoias
          </p>
          <h1 className="text-3xl font-light text-[#2C2825] tracking-wide">
            Registro de Venda
          </h1>
          <div className="mt-4 mx-auto w-12 h-px bg-[#C9A96E]" />
        </div>

        {/* Card */}
        <div className="bg-white border border-[#E8E2DA] shadow-sm rounded-sm p-8 space-y-6">

          {/* SKU Field */}
          <div className="space-y-1.5">
            <label className="block text-xs tracking-[0.2em] text-[#9B8E7E] uppercase">
              Código SKU
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setFormData((prev) => ({ ...prev, sku: val }));
                  lookupSKU(val);
                }}
                placeholder="Ex: MN-AN-001"
                className="w-full border-b border-[#D4CCBF] bg-transparent py-2.5 text-[#2C2825] placeholder-[#C5BBAE] text-sm tracking-wide focus:outline-none focus:border-[#C9A96E] transition-colors"
              />
              {/* Status indicator */}
              <div className="absolute right-0 top-2.5">
                {skuStatus === "loading" && (
                  <div className="w-4 h-4 border border-[#C9A96E] border-t-transparent rounded-full animate-spin" />
                )}
                {skuStatus === "found" && (
                  <svg className="w-4 h-4 text-[#7A9E7E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {(skuStatus === "not_found" || skuStatus === "no_stock") && (
                  <svg className="w-4 h-4 text-[#C47A5A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            </div>

            {/* SKU feedback */}
            {skuStatus === "not_found" && (
              <p className="text-xs text-[#C47A5A] tracking-wide">
                SKU não encontrado no catálogo.
              </p>
            )}
            {skuStatus === "no_stock" && (
              <p className="text-xs text-[#C47A5A] tracking-wide">
                Produto sem estoque disponível para sua conta.
              </p>
            )}
          </div>

          {/* Produto Info (aparece quando SKU é encontrado) */}
          {skuStatus === "found" && formData.nome_produto && (
            <div className="bg-[#FAF9F7] border border-[#E8E2DA] rounded-sm p-4 space-y-1">
              <p className="text-xs tracking-[0.2em] text-[#9B8E7E] uppercase">
                Produto identificado
              </p>
              <p className="text-[#2C2825] text-sm font-medium tracking-wide">
                {formData.nome_produto}
              </p>
              <p className="text-[#C9A96E] text-sm tracking-wider">
                R$ {formData.preco_unitario.toFixed(2).replace(".", ",")}
              </p>
            </div>
          )}

          {/* Quantidade */}
          <div className="space-y-1.5">
            <label className="block text-xs tracking-[0.2em] text-[#9B8E7E] uppercase">
              Quantidade
            </label>
            <input
              type="number"
              min={1}
              value={formData.quantidade}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  quantidade: Math.max(1, parseInt(e.target.value) || 1),
                }))
              }
              className="w-full border-b border-[#D4CCBF] bg-transparent py-2.5 text-[#2C2825] text-sm tracking-wide focus:outline-none focus:border-[#C9A96E] transition-colors"
            />
          </div>

          {/* Valor Total */}
          {skuStatus === "found" && (
            <div className="pt-2 border-t border-[#E8E2DA] flex justify-between items-center">
              <span className="text-xs tracking-[0.2em] text-[#9B8E7E] uppercase">
                Total da venda
              </span>
              <span className="text-lg text-[#2C2825] tracking-wide">
                R$ {valorTotal.toFixed(2).replace(".", ",")}
              </span>
            </div>
          )}

          {/* ── 3. GARANTIA — TEXTO EXATO SOLICITADO ────────────────────── */}
          <div className="pt-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={formData.garantia_aceita}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      garantia_aceita: e.target.checked,
                    }))
                  }
                />
                <div
                  className={`w-4 h-4 border transition-colors ${
                    formData.garantia_aceita
                      ? "bg-[#C9A96E] border-[#C9A96E]"
                      : "bg-white border-[#D4CCBF] group-hover:border-[#C9A96E]"
                  }`}
                >
                  {formData.garantia_aceita && (
                    <svg className="w-3 h-3 text-white m-auto mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              {/* TEXTO EXATO CONFORME SOLICITADO */}
              <span className="text-xs text-[#6B6259] leading-relaxed tracking-wide">
                concordo que estou entregando as peças em plenas condições com garantia de 12 meses.
              </span>
            </label>
          </div>

          {/* Error message */}
          {errorMessage && (
            <p className="text-xs text-[#C47A5A] tracking-wide">
              {errorMessage}
            </p>
          )}

          {/* Success message */}
          {submitStatus === "success" && (
            <div className="bg-[#F0F5F1] border border-[#B5CDB9] rounded-sm p-3">
              <p className="text-xs text-[#4A7A52] tracking-wide text-center">
                Venda registrada com sucesso.
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={
              submitStatus === "loading" ||
              skuStatus !== "found" ||
              !formData.garantia_aceita
            }
            className="w-full py-3.5 bg-[#2C2825] text-white text-xs tracking-[0.3em] uppercase transition-all hover:bg-[#C9A96E] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#2C2825]"
          >
            {submitStatus === "loading" ? "Registrando..." : "Registrar Venda"}
          </button>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-[#B5A99A] tracking-wide mt-6">
          Todas as vendas ficam registradas no seu histórico.
        </p>
      </div>
    </div>
  );
}

export default SaleRegistrationForm;
