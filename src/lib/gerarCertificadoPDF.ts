import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

export interface DadosCertificado {
  venda_id: string;
  produto_nome: string;
  sku: string;
  preco: number;
  data_compra: string; // ISO date YYYY-MM-DD
  consultora_nome: string;
  consultora_telefone?: string | null;
  tipo_venda?: "consultora" | "ecommerce";
}

function formatDataBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatPreco(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Cores Monarê
const COR_ESCURA = "#2C2825";
const COR_OURO   = "#C9A96E";
const COR_BEGE   = "#F5F2ED";
const COR_CINZA  = "#9B8E7E";

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

export async function gerarCertificadoPDF(dados: DadosCertificado): Promise<string> {
  // A5: 148 × 210 mm — bem legível em tela e impresso
  const doc = new jsPDF({ unit: "mm", format: "a5", orientation: "portrait" });
  const W = 148;
  const H = 210;
  const PAD = 12;

  // ── Fundo bege ──────────────────────────────────────────────
  doc.setFillColor(...hexToRgb(COR_BEGE));
  doc.rect(0, 0, W, H, "F");

  // ── Header: faixa escura ─────────────────────────────────────
  const HEADER_H = 36;
  doc.setFillColor(...hexToRgb(COR_ESCURA));
  doc.rect(0, 0, W, HEADER_H, "F");

  // "Monarê" em ouro
  doc.setFont("times", "italic");
  doc.setFontSize(28);
  doc.setTextColor(...hexToRgb(COR_OURO));
  doc.text("Monarê", W / 2, 18, { align: "center" });

  // Subtítulos
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(210, 195, 175);
  doc.text("CERTIFICADO DE GARANTIA  ·  SEMIJOIAS", W / 2, 28, { align: "center" });

  // Linha decorativa dourada abaixo do header
  doc.setDrawColor(...hexToRgb(COR_OURO));
  doc.setLineWidth(0.5);
  doc.line(PAD, HEADER_H + 5, W - PAD, HEADER_H + 5);

  let y = HEADER_H + 14;

  // ── Seção 1: Produto ──────────────────────────────────────────
  const secLabel = (label: string, yPos: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...hexToRgb(COR_OURO));
    doc.text(label, PAD, yPos);
    doc.setDrawColor(...hexToRgb(COR_OURO));
    doc.setLineWidth(0.25);
    doc.line(PAD + doc.getTextWidth(label) + 2, yPos - 0.5, W - PAD, yPos - 0.5);
  };

  secLabel("PRODUTO", y);
  y += 7;

  // Nome do produto
  doc.setFont("times", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...hexToRgb(COR_ESCURA));
  const nomeLines = doc.splitTextToSize(dados.produto_nome, W - PAD * 2);
  doc.text(nomeLines, PAD, y);
  y += nomeLines.length * 7 + 3;

  // Linha Preço | SKU (duas colunas, sem material)
  const col2 = W / 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...hexToRgb(COR_CINZA));
  doc.text("Preço", PAD, y);
  doc.text("SKU", col2, y);
  y += 4.5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...hexToRgb(COR_ESCURA));
  doc.text(formatPreco(dados.preco), PAD, y);
  doc.text(dados.sku, col2, y);
  y += 12;

  // ── Seção 2: Garantia ─────────────────────────────────────────
  secLabel("GARANTIA", y);
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...hexToRgb(COR_ESCURA));
  doc.text("Semijoias com garantia de 1 (um) ano de banho e cravação de zircônias.", PAD, y, {
    maxWidth: W - PAD * 2,
  });
  y += 12;

  const txtGarantia =
    "A garantia não se estende para peças quebradas, banhadas novamente, peças que " +
    "indiquem mau uso, bem como perda de tarraxas, pedras, cristais, pérolas ou fechos.";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...hexToRgb(COR_CINZA));
  const gLines = doc.splitTextToSize(txtGarantia, W - PAD * 2);
  doc.text(gLines, PAD, y);
  y += gLines.length * 4.5 + 9;

  // ── Seção 3: Trocas ───────────────────────────────────────────
  secLabel("TROCAS", y);
  y += 7;

  const txtTroca =
    "Somente com apresentação deste certificado e etiqueta vinculada à peça, no prazo " +
    "de 7 dias. Caso a compra tenha sido efetuada com uma de nossas consultoras, a " +
    "troca precisa ser feita dentro de 7 dias em seu mostruário, também com a etiqueta " +
    "vinculada à peça.";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...hexToRgb(COR_CINZA));
  const tLines = doc.splitTextToSize(txtTroca, W - PAD * 2);
  doc.text(tLines, PAD, y);
  y += tLines.length * 4.5 + 9;

  // ── Seção 4: Recibo de compra (faixa escura até o fim) ────────
  const RECIBO_Y = y;
  doc.setFillColor(...hexToRgb(COR_ESCURA));
  doc.rect(0, RECIBO_Y, W, H - RECIBO_Y, "F");

  y = RECIBO_Y + 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...hexToRgb(COR_OURO));
  doc.text("RECIBO DE COMPRA", PAD, y);
  doc.setDrawColor(...hexToRgb(COR_OURO));
  doc.setLineWidth(0.25);
  doc.line(PAD + doc.getTextWidth("RECIBO DE COMPRA") + 2, y - 0.5, W - PAD, y - 0.5);
  y += 10;

  // Linhas do recibo
  const LABEL_W = 38;
  const rows: [string, string][] = [
    ["Data da compra",  formatDataBR(dados.data_compra)],
    ["Consultora",      dados.consultora_nome],
    ["Telefone",        dados.consultora_telefone || "—"],
    ["SKU",             dados.sku],
    ["Tipo de venda",   dados.tipo_venda === "ecommerce" ? "E-commerce" : "Consultora"],
  ];

  doc.setFontSize(8.5);
  for (const [label, value] of rows) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 145, 125);
    doc.text(label, PAD, y);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(240, 233, 220);
    doc.text(value, PAD + LABEL_W, y, { maxWidth: W - PAD - LABEL_W - PAD });
    y += 7;
  }

  // ── Rodapé ────────────────────────────────────────────────────
  doc.setFont("times", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...hexToRgb(COR_OURO));
  doc.text("Monarê Semijoias — Sorocaba", W / 2, H - 6, { align: "center" });

  // ── Upload para Supabase Storage ──────────────────────────────
  const pdfBlob = doc.output("blob");

  const { error: uploadError } = await supabase.storage
    .from("certificados")
    .upload(`${dados.venda_id}.pdf`, pdfBlob, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) throw new Error(`Upload falhou: ${uploadError.message}`);

  const { data: urlData } = supabase.storage
    .from("certificados")
    .getPublicUrl(`${dados.venda_id}.pdf`);

  return urlData.publicUrl;
}
