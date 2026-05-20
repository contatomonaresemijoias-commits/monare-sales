import { useState, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface ProdutoOption {
  id: string;
  sku: string;
  nome: string;
  preco_venda?: number;
}

interface Props {
  produtos: ProdutoOption[];
  value: string;
  onChange: (value: string) => void;
  onSelect: (produto: ProdutoOption) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  rightSlot?: React.ReactNode;
}

export default function SkuCombobox({
  produtos,
  value,
  onChange,
  onSelect,
  placeholder = 'Digite o SKU...',
  className,
  inputClassName,
  rightSlot,
}: Props) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = value.trim().toUpperCase();
    if (q.length < 1) return [];
    return produtos
      .filter(
        (p) =>
          p.sku.toUpperCase().includes(q) ||
          p.nome.toUpperCase().includes(q),
      )
      .slice(0, 8);
  }, [value, produtos]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setHighlighted(0);
  }, [filtered.length]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const p = filtered[highlighted];
      if (p) { onSelect(p); setOpen(false); }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value.toUpperCase());
          setOpen(true);
        }}
        onFocus={() => { if (value.trim()) setOpen(true); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className={inputClassName}
      />
      {rightSlot}
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#E8E2DA] rounded-md shadow-lg overflow-hidden">
          {filtered.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onSelect(p); setOpen(false); }}
                onMouseEnter={() => setHighlighted(i)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-3 transition-colors ${
                  i === highlighted ? 'bg-[#FAF9F7]' : 'hover:bg-[#FAF9F7]'
                }`}
              >
                <span className="font-mono text-xs text-[#C9A96E] font-bold w-20 flex-shrink-0">
                  {p.sku}
                </span>
                <span className="text-[#2C2825] truncate flex-1">{p.nome}</span>
                {p.preco_venda != null && (
                  <span className="text-xs text-[#9B8E7E] flex-shrink-0">
                    R$ {p.preco_venda.toFixed(2)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
