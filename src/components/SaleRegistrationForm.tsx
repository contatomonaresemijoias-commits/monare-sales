import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SaleFormData {
  codigo_sku: string;
  produto_id: string;
  nome_produto: string;
  preco_unitario: number;
  quantidade: number;
  garantia_aceita: boolean;
}

export function SaleRegistrationForm() {
  const { user } = useAuth();

  const [formData, setFormData] = useState<SaleFormData>({
    codigo_sku: "",
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

  // ── LOOKUP DE SKU ─────────────────────────────────────────────────────────
  // Colunas reais confirmadas:
  //   produtos: id, codigo_sku, nome, preco_base
  //   estoque_parceiras: id, parceira_id, produto_id, quantidade

  const lookupSKU = useCallback(
    async (sku: string) => {
      const skuLimpo = sku.trim().toUpperCase();

      if (skuLimpo.length < 2) {
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
        // Passo A: produto existe? Usando codigo_sku (nome real da coluna)
        const { data: produto, error: produtoError } = await supabase
          .from("produtos")
          .select("id, nome, preco_base, codigo_sku")
          .eq("codigo_sku", skuLimpo)
          .maybeSingle();

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

        // Passo B: parceira tem estoque? Usando quantidade (nome real da coluna)
        const { data: estoque, error: estoqueError } = await supabase
          .from("estoque_parceiras")
          .select("quantidade")
          .eq("parceira_id", user.id)
          .eq("produto_id", produto.id)
          .maybeSingle();

        if (estoqueError) throw estoqueError;

        const temEstoque = estoque && estoque.quantidade > 0;

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

        // Tudo ok ✓
        setSkuStatus("found");
        setFormData((prev) => ({
          ...prev,
          produto_id: produto.id,
          nome_produto: produto.nome,
          preco_unitario: produto.preco_base,
        }));
      } catch (err) {
        console.error("[lookupSKU] Erro:", err);
        setSkuStatus("not_found");
      }
    },
    [user?.id]
  );

  // ── SUBMIT ────────────────────────────────────────────────────────────────

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
      const { error } = await supabase
        .from("vendas")
        .insert({
          parceira_id: user.id,
          produto_id: formData.produto_id,
          quantidade: formData.quantidade,
          preco_unitario: formData.preco_unitario,
          valor_total: formData.quantidade * formData.preco_unitario,
          garantia_aceita: formData.garantia_aceita,
        })
        .select("id");

      if (error) throw error;

      setSubmitStatus("success");
      setFormData({
        codigo_sku: "",
        produto_id: "",
        nome_produto: "",
        preco_unitario: 0,
        quantidade: 1,
        garantia_aceita: false,
      });
      setSkuStatus("idle");
    } catch (err: any) {
      console.error("[handleSubmit] Erro:", err);
      setSubmitStatus("error");
      setErrorMessage(err?.message || "Erro ao registrar venda.");
    }
  };

  const valorTotal = formData.quantidade * formData.preco_unitario;

  // ── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-[10px] tracking-[0.35em] text-[#9B8E7E] uppercase mb-2">
            Monarê Semijoias
          </p>
          <h1 className="text-2xl font-light text-[#2C2825] tracking-widest uppercase">
            Registro de Venda
          </h1>
          <div className="mt-4 mx-auto w-10 h-px bg-[#C9A96E]" />
        </div>

        {/* Card */}
        <div className="bg-white/90 backdrop-blur border border-[#E8E2DA] rounded-sm shadow-sm p-8 space-y-7">

          {/* SKU */}
          <div className="space-y-1.5">
            <label className="block text-[10px] tracking-[0.25em] text-[#9B8E7E] uppercase">
              Código SKU
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.codigo_sku}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setFormData((prev) => ({ ...prev, codigo_sku: val }));
                  lookupSKU(val);
                }}
                placeholder="Ex: MN-AN-001"
                autoComplete="off"
                className="w-full border-b border-[#D4CCBF] bg-transparent py-2.5 pr-6 text-[#2C2825] placeholder-[#C5BBAE] text-sm tracking-wide focus:outline-none focus:border-[#C9A96E] transition-colors"
              />
              <div className="absolute right-0 top-3">
                {skuStatus === "loading" && (
                  <div className="w-3.5 h-3.5 border border-[#C9A96E] border-t-transparent rounded-full animate-spin" />
                )}
                {skuStatus === "found" && (
                  <svg className="w-3.5 h-3.5 text-[#7A9E7E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {(skuStatus === "not_found" || skuStatus === "no_stock") && (
                  <svg className="w-3.5 h-3.5 text-[#C47A5A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            </div>
            {skuStatus === "not_found" && (
              <p className="text-[11px] text-[#C47A5A]">SKU não encontrado no catálogo.</p>
            )}
            {skuStatus === "no_stock" && (
              <p className="text-[11px] text-[#C47A5A]">Este produto não consta no seu mostruário.</p>
            )}
          </div>

          {/* Produto identificado — somente leitura */}
          {skuStatus === "found" && (
            <div className="bg-[#FAF9F7] border border-[#E8E2DA] rounded-sm p-4 space-y-3">
              <p className="text-[10px] tracking-[0.25em] text-[#9B8E7E] uppercase">
                Produto identificado
              </p>
              <div className="space-y-0.5">
                <p className="text-[10px] tracking-[0.2em] text-[#B5A99A] uppercase">Nome</p>
                <p className="text-[#2C2825] text-sm tracking-wide font-medium">
                  {formData.nome_produto}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] tracking-[0.2em] text-[#B5A99A] uppercase">Valor unitário</p>
                <p className="text-[#C9A96E] text-sm tracking-wider">
                  R$ {formData.preco_unitario.toFixed(2).replace(".", ",")}
                </p>
              </div>
            </div>
          )}

          {/* Quantidade */}
          <div className="space-y-1.5">
            <label className="block text-[10px] tracking-[0.25em] text-[#9B8E7E] uppercase">
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

          {/* Total */}
          {skuStatus === "found" && (
            <div className="flex justify-between items-center pt-1 border-t border-[#E8E2DA]">
              <span className="text-[10px] tracking-[0.25em] text-[#9B8E7E] uppercase">
                Total da venda
              </span>
              <span className="text-lg text-[#2C2825] tracking-wide">
                R$ {valorTotal.toFixed(2).replace(".", ",")}
              </span>
            </div>
          )}

          {/* Garantia */}
          <div>
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
                  className={`w-4 h-4 border transition-colors flex items-center justify-center ${
                    formData.garantia_aceita
                      ? "bg-[#C9A96E] border-[#C9A96E]"
                      : "bg-white border-[#D4CCBF] group-hover:border-[#C9A96E]"
                  }`}
                >
                  {formData.garantia_aceita && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-[11px] text-[#6B6259] leading-relaxed tracking-wide">
                concordo que estou entregando as peças em plenas condições com garantia de 12 meses.
              </span>
            </label>
          </div>

          {/* Erro */}
          {errorMessage && (
            <p className="text-[11px] text-[#C47A5A] tracking-wide">{errorMessage}</p>
          )}

          {/* Sucesso */}
          {submitStatus === "success" && (
            <div className="bg-[#F0F5F1] border border-[#B5CDB9] rounded-sm p-3 text-center">
              <p className="text-[11px] text-[#4A7A52] tracking-wide">
                Venda registrada com sucesso.
              </p>
            </div>
          )}

          {/* Botão */}
          <button
            onClick={handleSubmit}
            disabled={
              submitStatus === "loading" ||
              skuStatus !== "found" ||
              !formData.garantia_aceita
            }
            className="w-full py-3.5 bg-[#2C2825] text-white text-[10px] tracking-[0.35em] uppercase transition-all hover:bg-[#C9A96E] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#2C2825]"
          >
            {submitStatus === "loading" ? "Registrando..." : "Registrar Venda"}
          </button>
        </div>

        <p className="text-center text-[11px] text-[#B5A99A] tracking-wide mt-6">
          Todas as vendas ficam registradas no seu histórico.
        </p>
      </div>
    </div>
  );
}

export default SaleRegistrationForm;
