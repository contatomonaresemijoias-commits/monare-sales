import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

function gerarCodigoGarantia(): string {
  return "MN-" + Date.now().toString(36).toUpperCase();
}

function hojeISO(): string {
  return new Date().toISOString().split("T")[0];
}

function validadeISO(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
}

interface FormData {
  codigo_sku: string;
  produto_id: string;
  nome_produto: string;
  preco_unitario: number;
  cliente_nome: string;
  cliente_whatsapp: string;
  termo_aceito: boolean;
}

export function SaleRegistrationForm() {
  // FIX: usa profile direto do contexto — já tem o parceira_id correto
  // Sem busca extra ao Supabase que estava filtrando pela coluna errada
  const { user, profile } = useAuth();

  const [form, setForm] = useState<FormData>({
    codigo_sku: "",
    produto_id: "",
    nome_produto: "",
    preco_unitario: 0,
    cliente_nome: "",
    cliente_whatsapp: "",
    termo_aceito: false,
  });

  const [skuStatus, setSkuStatus] = useState<
    "idle" | "loading" | "found" | "not_found" | "no_stock"
  >("idle");

  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const [errorMsg, setErrorMsg] = useState("");

  const lookupSKU = useCallback(
    async (sku: string) => {
      const skuLimpo = sku.trim().toUpperCase();

      if (skuLimpo.length < 2) {
        setSkuStatus("idle");
        setForm((prev) => ({ ...prev, produto_id: "", nome_produto: "", preco_unitario: 0 }));
        return;
      }

      if (!user?.id || !profile?.parceira_id) return;

      setSkuStatus("loading");

      try {
        // Passo 1: busca produto por codigo_sku
        const { data: produto, error: produtoError } = await supabase
          .from("produtos")
          .select("id, nome, preco_base, codigo_sku")
          .eq("codigo_sku", skuLimpo)
          .maybeSingle();

        if (produtoError) throw produtoError;

        if (!produto) {
          setSkuStatus("not_found");
          setForm((prev) => ({ ...prev, produto_id: "", nome_produto: "", preco_unitario: 0 }));
          return;
        }

        // Passo 2: verifica estoque usando parceira_id do contexto (já correto)
        const { data: estoque, error: estoqueError } = await supabase
          .from("estoque_parceiras")
          .select("quantidade")
          .eq("parceira_id", profile.parceira_id)
          .eq("produto_id", produto.id)
          .maybeSingle();

        if (estoqueError) throw estoqueError;

        if (!estoque || estoque.quantidade <= 0) {
          setSkuStatus("no_stock");
          setForm((prev) => ({ ...prev, produto_id: "", nome_produto: "", preco_unitario: 0 }));
          return;
        }

        // Tudo ok ✓
        setSkuStatus("found");
        setForm((prev) => ({
          ...prev,
          produto_id: produto.id,
          nome_produto: produto.nome,
          preco_unitario: produto.preco_base,
        }));
      } catch (err) {
        console.error("[lookupSKU]", err);
        setSkuStatus("not_found");
      }
    },
    [user?.id, profile?.parceira_id]
  );

  const handleSubmit = async () => {
    if (!user?.id || !profile?.parceira_id) return;

    if (!form.produto_id) {
      setErrorMsg("Busque um SKU válido antes de registrar.");
      return;
    }
    if (!form.cliente_nome.trim()) {
      setErrorMsg("Informe o nome do cliente.");
      return;
    }
    if (!form.cliente_whatsapp.trim()) {
      setErrorMsg("Informe o WhatsApp do cliente.");
      return;
    }
    if (!form.termo_aceito) {
      setErrorMsg("É necessário aceitar o termo de garantia.");
      return;
    }

    setSubmitStatus("loading");
    setErrorMsg("");

    try {
      const { error } = await supabase
        .from("vendas")
        .insert({
          parceira_id: profile.parceira_id,
          vendedora_id: user.id,
          produto_id: form.produto_id,
          cliente_nome: form.cliente_nome.trim(),
          cliente_whatsapp: form.cliente_whatsapp.trim(),
          valor_venda: form.preco_unitario,
          data_venda: hojeISO(),
          validade_garantia: validadeISO(),
          codigo_garantia: gerarCodigoGarantia(),
          termo_aceito: form.termo_aceito,
        })
        .select("id");

      if (error) throw error;

      setSubmitStatus("success");
      setForm({
        codigo_sku: "",
        produto_id: "",
        nome_produto: "",
        preco_unitario: 0,
        cliente_nome: "",
        cliente_whatsapp: "",
        termo_aceito: false,
      });
      setSkuStatus("idle");
    } catch (err: any) {
      console.error("[handleSubmit]", err);
      setSubmitStatus("error");
      setErrorMsg(err?.message || "Erro ao registrar venda.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">

        <div className="text-center mb-10">
          <p className="text-[10px] tracking-[0.35em] text-[#9B8E7E] uppercase mb-2">
            Monarê Semijoias
          </p>
          <h1 className="text-2xl font-light text-[#2C2825] tracking-widest uppercase">
            Registro de Venda
          </h1>
          <div className="mt-4 mx-auto w-10 h-px bg-[#C9A96E]" />
        </div>

        <div className="bg-white/90 backdrop-blur border border-[#E8E2DA] rounded-sm shadow-sm p-8 space-y-6">

          {/* SKU */}
          <div className="space-y-1.5">
            <label className="block text-[10px] tracking-[0.25em] text-[#9B8E7E] uppercase">
              Código SKU
            </label>
            <div className="relative">
              <input
                type="text"
                value={form.codigo_sku}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setForm((prev) => ({ ...prev, codigo_sku: val }));
                  lookupSKU(val);
                }}
                placeholder="Ex: BM1000"
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
              <div>
                <p className="text-[10px] tracking-[0.2em] text-[#B5A99A] uppercase mb-0.5">Nome</p>
                <p className="text-[#2C2825] text-sm font-medium tracking-wide">{form.nome_produto}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.2em] text-[#B5A99A] uppercase mb-0.5">Valor</p>
                <p className="text-[#C9A96E] text-sm tracking-wider">
                  R$ {form.preco_unitario.toFixed(2).replace(".", ",")}
                </p>
              </div>
            </div>
          )}

          {/* Nome do cliente */}
          <div className="space-y-1.5">
            <label className="block text-[10px] tracking-[0.25em] text-[#9B8E7E] uppercase">
              Nome do cliente
            </label>
            <input
              type="text"
              value={form.cliente_nome}
              onChange={(e) => setForm((prev) => ({ ...prev, cliente_nome: e.target.value }))}
              placeholder="Nome completo"
              className="w-full border-b border-[#D4CCBF] bg-transparent py-2.5 text-[#2C2825] placeholder-[#C5BBAE] text-sm tracking-wide focus:outline-none focus:border-[#C9A96E] transition-colors"
            />
          </div>

          {/* WhatsApp do cliente */}
          <div className="space-y-1.5">
            <label className="block text-[10px] tracking-[0.25em] text-[#9B8E7E] uppercase">
              WhatsApp do cliente
            </label>
            <input
              type="tel"
              value={form.cliente_whatsapp}
              onChange={(e) => setForm((prev) => ({ ...prev, cliente_whatsapp: e.target.value }))}
              placeholder="(11) 99999-9999"
              className="w-full border-b border-[#D4CCBF] bg-transparent py-2.5 text-[#2C2825] placeholder-[#C5BBAE] text-sm tracking-wide focus:outline-none focus:border-[#C9A96E] transition-colors"
            />
          </div>

          {/* Garantia */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={form.termo_aceito}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, termo_aceito: e.target.checked }))
                  }
                />
                <div
                  className={`w-4 h-4 border transition-colors flex items-center justify-center ${
                    form.termo_aceito
                      ? "bg-[#C9A96E] border-[#C9A96E]"
                      : "bg-white border-[#D4CCBF] group-hover:border-[#C9A96E]"
                  }`}
                >
                  {form.termo_aceito && (
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
          {errorMsg && (
            <p className="text-[11px] text-[#C47A5A] tracking-wide">{errorMsg}</p>
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
              !form.termo_aceito
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
