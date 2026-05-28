import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// ─── Conversão de unidades ────────────────────────────────────────────────────
const CM = 28.3465;          // 1 cm em pontos PDF
const PAGE_H = 29.7 * CM;   // altura A4 em pontos (origem PDF = canto inferior esquerdo)

/** cm a partir da esquerda → pontos */
const px = (cm: number) => cm * CM;

/** cm a partir do topo → pontos (converte para eixo Y de baixo pra cima do PDF) */
const py = (cm: number) => PAGE_H - cm * CM;

// ─── Posições dos campos (medidas fornecidas pelo usuário) ────────────────────
//
//  As coordenadas y são o topo da label; o valor é inserido ~0.75cm abaixo.
//  DATA DA COMPRA: o usuário anotou x=5.02 (igual ao SKU) pois estão na mesma
//  linha — o x real foi estimado visualmente em ≈10.9cm (após o box do SKU).
//  Ajuste FIELD_X_DATA se necessário.

const LABEL_OFFSET_Y = 0.72; // cm abaixo do topo da label para o texto do valor
const FONT_SIZE       = 11;
const TEXT_COLOR      = rgb(0.35, 0.12, 0.22); // rosa-escuro igual ao PDF

const FIELDS = {
  clientName:  { x: px(4.52), y: py(11.04 + LABEL_OFFSET_Y) },
  sku:         { x: px(4.52), y: py(12.41 + LABEL_OFFSET_Y) },
  date:        { x: px(12.84), y: py(12.41 + LABEL_OFFSET_Y) },
  description: { x: px(4.52), y: py(13.68 + LABEL_OFFSET_Y) },
  consultora:  { x: px(4.52), y: py(14.95 + LABEL_OFFSET_Y) },
} as const;

// ─── Interface pública ────────────────────────────────────────────────────────
export interface CertificatePayload {
  clientName:  string;
  sku:         string;
  purchaseDate: string; // formato "dd/mm/aaaa"
  description: string;
  consultora:  string;
}

// ─── Geração do PDF ───────────────────────────────────────────────────────────
export async function generateCertificatePDF(data: CertificatePayload): Promise<Uint8Array> {
  const res = await fetch('/certificado_template.pdf');
  if (!res.ok) throw new Error('Template do certificado não encontrado em /certificado_template.pdf');

  const templateBytes = await res.arrayBuffer();
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page   = pdfDoc.getPages()[0];
  const font   = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const entries: { text: string; x: number; y: number }[] = [
    { text: data.clientName,   ...FIELDS.clientName  },
    { text: data.sku,          ...FIELDS.sku         },
    { text: data.purchaseDate, ...FIELDS.date        },
    { text: data.description,  ...FIELDS.description },
    { text: data.consultora,   ...FIELDS.consultora  },
  ];

  for (const { text, x, y } of entries) {
    if (!text) continue;
    page.drawText(text, { x, y, font, size: FONT_SIZE, color: TEXT_COLOR });
  }

  return pdfDoc.save();
}

// ─── Helper: dispara download no browser ─────────────────────────────────────
export function downloadPDF(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
