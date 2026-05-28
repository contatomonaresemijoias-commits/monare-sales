import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SkuCombobox, { type ProdutoOption } from "@/components/SkuCombobox";
import SuccessModal from "@/components/SuccessModal";
import { formatWhatsApp } from "@/lib/monare";
import { gerarCertificadoPDF } from "@/lib/gerarCertificadoPDF";
import { X } from "lucide-react";

function gerarCodigoGarantia(index: number = 0): string {
  return "MN-" + (Date.now() + index).toString(36).toUpperCase();
}

function gerarUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function hojeISO(): string {
  return new Date().toISOString().split("T")[0];
}

function minDataISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 3);
  return d.toISOString().split("T")[0];
}

function validadeFromData(dataVenda: string): string {
  const d = new Date(dataVenda + "T12:00:00");
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
}

function formatDataBR(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

interface ItemVenda {
  codigo_sku: string;
  produto_id: string;
  nome_produto: string;
  preco_unitario: number;
}

interface FormData {
  data_venda: string;
  cliente_nome: string;
  cliente_whatsapp: string;
  termo_aceito: boolean;
}

type Props = {
  externalSku?: string;
  onSkuConsumed?: () => void;
};

const FORM_INICIAL: FormData = {
  data_venda: hojeISO(),
  cliente_nome: "",
  cliente_whatsapp: "",
  termo_aceito: false,
};

export function SaleRegistrationForm({ externalSku, onSkuConsumed }: Props) {
  const { user, profile } = useAuth();

  const [produtoOptions, setProdutoOptions] = useState<ProdutoOption[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("estoque")
      .select("quantidade, produto:produto_id(id, sku, nome, preco_venda, ativo)")
      .eq("user_id", user.id)
      .gt("quantidade", 0)
      .then(({ data }) => {
        const options: ProdutoOption[] = (data ?? [])
          .filter((e) => (e.produto as any)?.ativo)
          .map((e) => {
            const p = e.produto as any;
            return { id: p.id, sku: p.sku, nome: p.nome, preco_venda: p.preco_venda };
          })
          .sort((a, b) => a.sku.localeCompare(b.sku));
        setProdutoOptions(options);
      });
  }, [user?.id]);

  // Quando a sidebar seleciona um produto, dispara o lookup do SKU
  useEffect(() => {
    if (!externalSku) return;
    setCurrentSku(externalSku);
    lookupSKU(externalSku);
    onSkuConsumed?.();
  }, [externalSku]);

  const [form, setForm] = useState<FormData>(FORM_INICIAL);
  const [items, setItems] = useState<ItemVenda[]>([]);
  const [step, setStep] = useState<"form" | "summary">("form");

  // Estado do SKU sendo digitado agora
  const [currentSku, setCurrentSku] = useState("");
  const [currentProduto, setCurrentProduto] = useState<{
    id: string;
    nome: string;
    preco_unitario: number;
  } | null>(null);
  const [skuStatus, setSkuStatus] = useState<
    "idle" | "loading" | "found" | "not_found" | "no_stock"
  >("idle");

  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const [errorMsg, setErrorMsg] = useState("");
  const [successData, setSuccessData] = useState<{
    items: Array<{ produto_nome: string; sku: string; codigo_garantia: string; validade_garantia: string; pdf_garantia_url?: string | null; }>;
    cliente_nome: string;
    cliente_whatsapp: string;
    revendedora_nome: string;
    garantia_uuid: string;
  } | null>(null);

  // Lookup de cliente pelo WhatsApp
  const [clienteStatus, setClienteStatus] = useState<"idle" | "loading" | "found" | "new">("idle");
  const clienteLookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Alterar número de contato do cliente
  const [alterandoNumero, setAlterandoNumero] = useState(false);
  const [novoNumero, setNovoNumero] = useState("");
  const [alterarStatus, setAlterarStatus] = useState<"idle" | "loading" | "error">("idle");
  const [alterarErro, setAlterarErro] = useState("");

  const lookupCliente = useCallback(async (whatsapp: string) => {
    const digits = whatsapp.replace(/\D/g, "");
    if (digits.length < 10) {
      setClienteStatus("idle");
      setAlterandoNumero(false);
      return;
    }
    setClienteStatus("loading");
    setAlterandoNumero(false);
    const { data } = await supabase
      .from("clientes")
      .select("nome")
      .eq("whatsapp", digits)
      .maybeSingle();
    if (data) {
      setClienteStatus("found");
      setForm((prev) => ({ ...prev, cliente_nome: data.nome }));
    } else {
      setClienteStatus("new");
    }
  }, []);

  const handleAlterarNumero = async () => {
    const digitsAntigo = form.cliente_whatsapp.replace(/\D/g, "");
    const digitsNovo = novoNumero.replace(/\D/g, "");

    if (digitsNovo.length < 10) {
      setAlterarErro("Informe um número válido com DDD.");
      return;
    }
    if (digitsNovo === digitsAntigo) {
      setAlterarErro("O novo número é igual ao atual.");
      return;
    }

    setAlterarStatus("loading");
    setAlterarErro("");

    const { error } = await supabase
      .from("clientes")
      .update({ whatsapp: digitsNovo })
      .eq("whatsapp", digitsAntigo);

    if (error) {
      setAlterarStatus("error");
      setAlterarErro(error.message || "Erro ao atualizar número.");
      return;
    }

    // Atualiza o campo do formulário com o novo número formatado
    const formatted = formatWhatsApp(digitsNovo);
    setForm((prev) => ({ ...prev, cliente_whatsapp: formatted }));
    setAlterandoNumero(false);
    setNovoNumero("");
    setAlterarStatus("idle");
  };

  const lookupSKU = useCallback(
    async (sku: string) => {
      const skuLimpo = sku.trim().toUpperCase();

      if (skuLimpo.length < 2) {
        setSkuStatus("idle");
        setCurrentProduto(null);
        return;
      }

      if (!user?.id) return;

      setSkuStatus("loading");
      setCurrentProduto(null);

      try {
        const { data: produto, error: produtoError } = await supabase
          .from("produtos")
          .select("id, nome, preco_venda, sku")
          .eq("sku", skuLimpo)
          .maybeSingle();

        if (produtoError) throw produtoError;

        if (!produto) {
          setSkuStatus("not_found");
          return;
        }

        if (user?.id) {
          const { data: estoque, error: estoqueError } = await supabase
            .from("estoque")
            .select("quantidade")
            .eq("user_id", user.id)
            .eq("produto_id", produto.id)
            .maybeSingle();

          if (estoqueError) throw estoqueError;

          // Calcula quantos já foram adicionados à lista atual
          const jaAdicionados = items.filter((i) => i.produto_id === produto.id).length;
          const disponiveis = (estoque?.quantidade ?? 0) - jaAdicionados;

          if (!estoque || disponiveis <= 0) {
            setSkuStatus("no_stock");
            return;
          }
        }

        setSkuStatus("found");
        setCurrentProduto({
          id: produto.id,
          nome: produto.nome,
          preco_unitario: Number(produto.preco_venda),
        });
      } catch (err) {
        console.error("[lookupSKU]", err);
        setSkuStatus("not_found");
      }
    },
    [user?.id, items]
  );

  const handleAdicionarItem = () => {
    if (!currentProduto || skuStatus !== "found") return;

    setItems((prev) => [
      ...prev,
      {
        codigo_sku: currentSku.trim().toUpperCase(),
        produto_id: currentProduto.id,
        nome_produto: currentProduto.nome,
        preco_unitario: currentProduto.preco_unitario,
      },
    ]);

    // Limpa o campo de SKU para o próximo produto
    setCurrentSku("");
    setCurrentProduto(null);
    setSkuStatus("idle");
  };

  const handleRemoverItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRevisar = () => {
    setErrorMsg("");

    if (!user?.id) {
      setErrorMsg("Você precisa estar logado para registrar uma venda.");
      return;
    }
    if (items.length === 0) {
      setErrorMsg("Adicione ao menos um produto à venda.");
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

    setStep("summary");
  };

  const handleSubmit = async () => {
    if (!user?.id) return;

    setSubmitStatus("loading");
    setErrorMsg("");

    const validadeGarantia = validadeFromData(form.data_venda);
    const digits = form.cliente_whatsapp.replace(/\D/g, "");

    try {
      // UUID público único por transação — compartilhado entre todos os itens
      const garantiaUUID = gerarUUID();

      // Gera um código de garantia único por item e insere uma venda por produto
      const vendaInserts = items.map((item, i) => ({
        user_id: user.id,
        ...(profile?.parceira_id ? { parceira_id: profile.parceira_id } : {}),
        produto_id: item.produto_id,
        produto_nome: item.nome_produto,
        cliente_nome: form.cliente_nome.trim(),
        cliente_whatsapp: form.cliente_whatsapp.trim(),
        valor_venda: item.preco_unitario,
        data_venda: form.data_venda,
        validade_garantia: validadeGarantia,
        codigo_garantia: gerarCodigoGarantia(i),
        termo_aceito: form.termo_aceito,
        garantia_uuid: garantiaUUID,
      }));

      const { data: inserted, error } = await supabase
        .from("vendas")
        .insert(vendaInserts as any)
        .select("id, codigo_garantia, produto_nome");

      if (error) throw error;

      // Cadastra ou atualiza o cliente
      if (digits.length >= 10) {
        await supabase.from("clientes").upsert(
          {
            whatsapp: digits,
            nome: form.cliente_nome.trim(),
            user_id: user.id,
          },
          { onConflict: "whatsapp" },
        );
      }

      // Gera PDFs em paralelo e atualiza pdf_garantia_url em cada venda
      const consultora_nome = profile?.display_name ?? "Consultora";
      const consultora_telefone = (profile as any)?.telefone ?? null;
      const pdfResults = await Promise.allSettled(
        (inserted ?? []).map(async (row, i) => {
          const item = items[i];
          const url = await gerarCertificadoPDF({
            venda_id: row.id,
            produto_nome: item.nome_produto,
            sku: item.codigo_sku,
            preco: item.preco_unitario,
            data_compra: form.data_venda,
            consultora_nome,
            consultora_telefone,
            tipo_venda: "consultora",
          });
          await supabase.from("vendas").update({ pdf_garantia_url: url } as any).eq("id", row.id);
          return { venda_id: row.id, url };
        })
      );

      const pdfUrls: Record<string, string> = {};
      for (const r of pdfResults) {
        if (r.status === "fulfilled") pdfUrls[r.value.venda_id] = r.value.url;
      }

      // Monta dados de sucesso combinando items locais com códigos retornados
      const successItems = (inserted ?? []).map((row, i) => ({
        produto_nome: items[i].nome_produto,
        sku: items[i].codigo_sku,
        codigo_garantia: row.codigo_garantia,
        validade_garantia: validadeGarantia,
        pdf_garantia_url: pdfUrls[row.id] ?? null,
      }));

      setSuccessData({
        items: successItems,
        cliente_nome: form.cliente_nome.trim(),
        cliente_whatsapp: digits,
        revendedora_nome: profile?.display_name ?? "",
        garantia_uuid: garantiaUUID,
      });

      setSubmitStatus("success");
      setClienteStatus("idle");
      setSkuStatus("idle");
      setStep("form");
      setItems([]);
      setCurrentSku("");
      setCurrentProduto(null);
      setForm({ ...FORM_INICIAL, data_venda: hojeISO() });
    } catch (err: any) {
      console.error("[handleSubmit]", err);
      setSubmitStatus("error");
      setErrorMsg(err?.message || "Erro ao registrar venda.");
    }
  };

  // Tela de resumo antes da confirmação
  if (step === "summary") {
    return (
      <div className="w-full">
        <div className="bg-white/90 backdrop-blur border border-[#E8E2DA] rounded-sm shadow-sm p-8 space-y-6">
          <div>
            <p className="text-[10px] tracking-[0.35em] text-[#9B8E7E] uppercase mb-4">
              Confirme os dados da venda
            </p>

            <div className="space-y-4 border border-[#E8E2DA] rounded-sm p-5 bg-[#FAF9F7]">
              {/* Lista de produtos */}
              <div className="space-y-1">
                <p className="text-[10px] tracking-[0.2em] text-[#B5A99A] uppercase mb-2">
                  Produtos ({items.length})
                </p>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        <p className="text-[#2C2825] text-sm font-medium tracking-wide">{item.nome_produto}</p>
                        <p className="text-[#C9A96E] text-xs tracking-wider font-mono">{item.codigo_sku}</p>
                      </div>
                      <p className="text-[#6B6259] text-xs">
                        R$ {item.preco_unitario.toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-[#E8E2DA]" />

              <div className="space-y-1">
                <p className="text-[10px] tracking-[0.2em] text-[#B5A99A] uppercase">Data da venda</p>
                <p className="text-[#2C2825] text-sm tracking-wide">{formatDataBR(form.data_venda)}</p>
              </div>

              <div className="h-px bg-[#E8E2DA]" />

              <div className="space-y-1">
                <p className="text-[10px] tracking-[0.2em] text-[#B5A99A] uppercase">Cliente</p>
                <p className="text-[#2C2825] text-sm font-medium tracking-wide">{form.cliente_nome}</p>
                <p className="text-[#6B6259] text-xs tracking-wide">{form.cliente_whatsapp}</p>
              </div>

              <div className="h-px bg-[#E8E2DA]" />

              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-[#C9A96E] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <p className="text-[11px] text-[#6B6259] tracking-wide">
                  Cada peça recebe seu próprio <span className="font-semibold text-[#C9A96E]">certificado de garantia de 12 meses</span>.
                </p>
              </div>
            </div>
          </div>

          {errorMsg && (
            <p className="text-[11px] text-[#C47A5A] tracking-wide">{errorMsg}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { setStep("form"); setErrorMsg(""); setSubmitStatus("idle"); }}
              disabled={submitStatus === "loading"}
              className="flex-1 py-3.5 border border-[#D4CCBF] text-[#6B6259] text-[10px] tracking-[0.35em] uppercase transition-all hover:border-[#C9A96E] hover:text-[#C9A96E] disabled:opacity-40"
            >
              Voltar
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitStatus === "loading"}
              className="flex-1 py-3.5 bg-[#2C2825] text-white text-[10px] tracking-[0.35em] uppercase transition-all hover:bg-[#C9A96E] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#2C2825]"
            >
              {submitStatus === "loading" ? "Registrando..." : "Confirmar Venda"}
            </button>
          </div>
        </div>

        {successData && (
          <SuccessModal
            items={successData.items}
            cliente_nome={successData.cliente_nome}
            cliente_whatsapp={successData.cliente_whatsapp}
            revendedora_nome={successData.revendedora_nome}
            garantia_uuid={successData.garantia_uuid}
            onClose={() => setSuccessData(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div>
        <div className="bg-white/90 backdrop-blur border border-[#E8E2DA] rounded-sm shadow-sm p-8 space-y-6">

          {/* Campo SKU + botão Adicionar */}
          <div className="space-y-1.5">
            <label className="block text-[10px] tracking-[0.25em] text-[#9B8E7E] uppercase">
              Código SKU
            </label>
            <SkuCombobox
              produtos={produtoOptions}
              value={currentSku}
              onChange={(val) => {
                setCurrentSku(val);
                lookupSKU(val);
              }}
              onSelect={(produto) => {
                setCurrentSku(produto.sku);
                lookupSKU(produto.sku);
              }}
              placeholder="Ex: BM1000"
              inputClassName="w-full border-b border-[#D4CCBF] bg-transparent py-2.5 pr-6 text-[#2C2825] placeholder-[#C5BBAE] text-sm tracking-wide focus:outline-none focus:border-[#C9A96E] transition-colors"
              rightSlot={
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
              }
            />
            {skuStatus === "not_found" && (
              <p className="text-[11px] text-[#C47A5A]">SKU não encontrado no catálogo.</p>
            )}
            {skuStatus === "no_stock" && (
              <p className="text-[11px] text-[#C47A5A]">Este produto não consta no seu mostruário.</p>
            )}
          </div>

          {skuStatus === "found" && currentProduto && (
            <div className="bg-[#FAF9F7] border border-[#E8E2DA] rounded-sm p-4 space-y-3">
              <p className="text-[10px] tracking-[0.25em] text-[#9B8E7E] uppercase">
                Produto identificado
              </p>
              <div>
                <p className="text-[10px] tracking-[0.2em] text-[#B5A99A] uppercase mb-0.5">Nome</p>
                <p className="text-[#2C2825] text-sm font-medium tracking-wide">{currentProduto.nome}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.2em] text-[#B5A99A] uppercase mb-0.5">Valor</p>
                <p className="text-[#C9A96E] text-sm tracking-wider">
                  R$ {currentProduto.preco_unitario.toFixed(2).replace(".", ",")}
                </p>
              </div>
              <button
                onClick={handleAdicionarItem}
                className="w-full py-2.5 border border-[#C9A96E] text-[#C9A96E] text-[10px] tracking-[0.35em] uppercase transition-all hover:bg-[#C9A96E] hover:text-white"
              >
                + Adicionar à venda
              </button>
            </div>
          )}

          {/* Lista de itens adicionados */}
          {items.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] tracking-[0.25em] text-[#9B8E7E] uppercase">
                Itens da venda ({items.length})
              </p>
              <div className="border border-[#E8E2DA] rounded-sm divide-y divide-[#E8E2DA]">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-[#2C2825] text-xs font-medium tracking-wide">{item.nome_produto}</p>
                      <p className="text-[#C9A96E] text-[10px] tracking-wider font-mono">{item.codigo_sku}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-[#6B6259] text-xs">
                        R$ {item.preco_unitario.toFixed(2).replace(".", ",")}
                      </p>
                      <button
                        onClick={() => handleRemoverItem(i)}
                        className="text-[#B5A99A] hover:text-[#C47A5A] transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[#B5A99A] tracking-wide">
                Cada peça receberá um certificado de garantia individual.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-[10px] tracking-[0.25em] text-[#9B8E7E] uppercase">
              Data da venda
            </label>
            <input
              type="date"
              value={form.data_venda}
              min={minDataISO()}
              max={hojeISO()}
              onChange={(e) => setForm((prev) => ({ ...prev, data_venda: e.target.value }))}
              className="w-full border-b border-[#D4CCBF] bg-transparent py-2.5 text-[#2C2825] text-sm tracking-wide focus:outline-none focus:border-[#C9A96E] transition-colors"
            />
            <p className="text-[10px] text-[#B5A99A] tracking-wide">
              Máximo 3 dias anteriores à data atual.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] tracking-[0.25em] text-[#9B8E7E] uppercase">
              WhatsApp do cliente
            </label>
            <input
              type="tel"
              value={form.cliente_whatsapp}
              onChange={(e) => {
                const formatted = formatWhatsApp(e.target.value);
                setForm((prev) => ({ ...prev, cliente_whatsapp: formatted }));
                if (clienteLookupTimer.current) clearTimeout(clienteLookupTimer.current);
                clienteLookupTimer.current = setTimeout(() => lookupCliente(formatted), 600);
              }}
              placeholder="(11) 99999-9999"
              className="w-full border-b border-[#D4CCBF] bg-transparent py-2.5 text-[#2C2825] placeholder-[#C5BBAE] text-sm tracking-wide focus:outline-none focus:border-[#C9A96E] transition-colors"
            />
            {clienteStatus === "loading" && (
              <p className="text-[11px] text-[#B5A99A] tracking-wide">Verificando cliente…</p>
            )}
            {clienteStatus === "found" && !alterandoNumero && (
              <div className="flex items-center justify-between pt-0.5">
                <p className="text-[11px] text-[#7A9E7E] tracking-wide">Cliente existente — dados preenchidos.</p>
                <button
                  type="button"
                  onClick={() => { setAlterandoNumero(true); setNovoNumero(""); setAlterarErro(""); setAlterarStatus("idle"); }}
                  className="text-[10px] text-[#9B8E7E] tracking-[0.2em] uppercase underline underline-offset-2 hover:text-[#C9A96E] transition-colors"
                >
                  Alterar número
                </button>
              </div>
            )}
            {clienteStatus === "found" && alterandoNumero && (
              <div className="mt-2 space-y-2 border border-[#E8E2DA] rounded-sm p-3 bg-[#FAF9F7]">
                <p className="text-[10px] tracking-[0.2em] text-[#9B8E7E] uppercase">Novo número de contato</p>
                <input
                  type="tel"
                  value={novoNumero}
                  onChange={(e) => { setNovoNumero(formatWhatsApp(e.target.value)); setAlterarErro(""); }}
                  placeholder="(11) 99999-9999"
                  className="w-full border-b border-[#D4CCBF] bg-transparent py-2 text-[#2C2825] placeholder-[#C5BBAE] text-sm tracking-wide focus:outline-none focus:border-[#C9A96E] transition-colors"
                />
                {alterarErro && (
                  <p className="text-[11px] text-[#C47A5A]">{alterarErro}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setAlterandoNumero(false); setNovoNumero(""); setAlterarErro(""); setAlterarStatus("idle"); }}
                    className="flex-1 py-2 border border-[#D4CCBF] text-[#6B6259] text-[10px] tracking-[0.25em] uppercase hover:border-[#C9A96E] hover:text-[#C9A96E] transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAlterarNumero}
                    disabled={alterarStatus === "loading"}
                    className="flex-1 py-2 bg-[#2C2825] text-white text-[10px] tracking-[0.25em] uppercase hover:bg-[#C9A96E] disabled:opacity-40 transition-all"
                  >
                    {alterarStatus === "loading" ? "Salvando…" : "Salvar"}
                  </button>
                </div>
              </div>
            )}
            {clienteStatus === "new" && (
              <p className="text-[11px] text-[#C9A96E] tracking-wide">Novo cliente — será cadastrado ao registrar a venda.</p>
            )}
          </div>

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
                <div className={`w-4 h-4 border transition-colors flex items-center justify-center ${
                  form.termo_aceito ? "bg-[#C9A96E] border-[#C9A96E]" : "bg-white border-[#D4CCBF] group-hover:border-[#C9A96E]"
                }`}>
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

          {errorMsg && (
            <p className="text-[11px] text-[#C47A5A] tracking-wide">{errorMsg}</p>
          )}

          <button
            onClick={handleRevisar}
            disabled={items.length === 0 || !form.termo_aceito}
            className="w-full py-3.5 bg-[#2C2825] text-white text-[10px] tracking-[0.35em] uppercase transition-all hover:bg-[#C9A96E] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#2C2825]"
          >
            Revisar e Registrar
          </button>
        </div>

        <p className="text-center text-[11px] text-[#B5A99A] tracking-wide mt-6">
          Todas as vendas ficam registradas no seu histórico.
        </p>
      </div>

      {successData && (
        <SuccessModal
          items={successData.items}
          cliente_nome={successData.cliente_nome}
          cliente_whatsapp={successData.cliente_whatsapp}
          revendedora_nome={successData.revendedora_nome}
          garantia_uuid={successData.garantia_uuid}
          onClose={() => setSuccessData(null)}
        />
      )}
    </div>
  );
}

export default SaleRegistrationForm;
