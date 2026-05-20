import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Check, Pencil, X, Tag, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

type Categoria = {
  id: string;
  nome: string;
};

type Produto = {
  id: string;
  sku: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  preco_venda: number;
  categoria_id: string | null;
};

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);

  // Seções colapsáveis
  const [catExpanded, setCatExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Formulário de nova categoria
  const [catNome, setCatNome] = useState('');
  const [addingCat, setAddingCat] = useState(false);

  // Formulário de novo produto
  const [catSelecionada, setCatSelecionada] = useState('');
  const [sku, setSku] = useState('');
  const [nome, setNome] = useState('');
  const [precoVenda, setPrecoVenda] = useState('');
  const [adding, setAdding] = useState(false);

  // Edição inline de produto
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nome: '', preco_venda: '', categoria_id: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  async function loadCategorias() {
    const { data } = await supabase.from('categorias').select('*').order('nome');
    setCategorias((data ?? []) as Categoria[]);
  }

  async function load() {
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase.from('produtos').select('*').order('sku'),
      supabase.from('categorias').select('id, nome').order('nome'),
    ]);
    setProdutos((prods ?? []) as Produto[]);
    setCategorias((cats ?? []) as Categoria[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // Atualiza SKU sugerido sempre que a lista de produtos mudar
  useEffect(() => {
    const nextNum = (produtos.length + 1).toString().padStart(3, '0');
    setSku(`SKU-${nextNum}`);
  }, [produtos.length]);

  // Quando categoria é selecionada, gera SKU sequencial global no padrão SKU-NNN
  function onCategoriaChange(catId: string) {
    setCatSelecionada(catId);
    const nextNum = (produtos.length + 1).toString().padStart(3, '0');
    setSku(`SKU-${nextNum}`);
  }

  async function addCategoria(e: React.FormEvent) {
    e.preventDefault();
    if (!catNome.trim()) return;
    setAddingCat(true);
    const { error } = await supabase.from('categorias').insert({
      nome: catNome.trim(),
      prefixo: catNome.trim().slice(0, 6).toUpperCase(),
    });
    setAddingCat(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setCatNome('');
      setCatPrefixo('');
      toast({ title: 'Categoria criada' });
      load();
    }
  }

  async function excluirCategoria(cat: Categoria) {
    const temProdutos = produtos.some((p) => p.categoria_id === cat.id);
    if (temProdutos) {
      toast({
        title: 'Categoria em uso',
        description: 'Remova ou reatribua os produtos desta categoria antes de excluí-la.',
        variant: 'destructive',
      });
      return;
    }
    if (!confirm(`Excluir categoria "${cat.nome}"?`)) return;
    const { error } = await supabase.from('categorias').delete().eq('id', cat.id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Categoria excluída' });
      load();
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!sku.trim() || !nome.trim()) return;
    const preco = parseFloat(precoVenda.replace(',', '.')) || 0;
    if (preco < 0) {
      toast({ title: 'Preço inválido', variant: 'destructive' });
      return;
    }
    setAdding(true);
    const { error } = await supabase.from('produtos').insert({
      sku: sku.trim().toUpperCase(),
      nome: nome.trim(),
      preco_venda: preco,
      categoria_id: catSelecionada || null,
    });
    setAdding(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setCatSelecionada('');
      setSku('');
      setNome('');
      setPrecoVenda('');
      load();
    }
  }

  function iniciarEdicao(p: Produto) {
    setEditId(p.id);
    setEditForm({
      nome: p.nome,
      preco_venda: p.preco_venda?.toString() ?? '0',
      categoria_id: p.categoria_id ?? '',
    });
  }

  function cancelarEdicao() {
    setEditId(null);
    setEditForm({ nome: '', preco_venda: '', categoria_id: '' });
  }

  async function salvarEdicao(p: Produto) {
    const preco = parseFloat(editForm.preco_venda.replace(',', '.'));
    if (!editForm.nome.trim() || isNaN(preco) || preco < 0) {
      toast({ title: 'Preencha nome e preço válidos', variant: 'destructive' });
      return;
    }
    setSavingEdit(true);
    const { error } = await supabase
      .from('produtos')
      .update({
        nome: editForm.nome.trim(),
        preco_venda: preco,
        categoria_id: editForm.categoria_id || null,
      })
      .eq('id', p.id);
    setSavingEdit(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Produto atualizado' });
      cancelarEdicao();
      load();
    }
  }

  async function toggleAtivo(p: Produto) {
    const { error } = await supabase.from('produtos').update({ ativo: !p.ativo }).eq('id', p.id);
    if (!error) load();
  }

  async function excluir(p: Produto) {
    if (!confirm(`Excluir produto ${p.sku} - ${p.nome}? Isso removerá também o estoque vinculado.`))
      return;
    const { error } = await supabase.from('produtos').delete().eq('id', p.id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Produto excluído' });
      load();
    }
  }

  function toggleCollapsed(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-rosa" />
      </div>
    );

  // Agrupa produtos: primeiro por categoria, depois sem categoria
  const semCategoria = produtos.filter((p) => !p.categoria_id);
  const grupos = categorias.map((cat) => ({
    cat,
    prods: produtos.filter((p) => p.categoria_id === cat.id),
  }));

  const totalProdutos = produtos.length;

  return (
    <div className="space-y-6">
      {/* ── Gerenciar Categorias ── */}
      <section className="bg-white rounded-2xl border border-bege p-5">
        <button
          className="flex items-center gap-2 w-full text-left"
          onClick={() => setCatExpanded((v) => !v)}
        >
          <Tag size={16} className="text-rosa" />
          <h3 className="font-serif text-xl text-ink flex-1">
            Categorias ({categorias.length})
          </h3>
          {catExpanded ? (
            <ChevronDown size={16} className="text-ink-soft" />
          ) : (
            <ChevronRight size={16} className="text-ink-soft" />
          )}
        </button>

        {catExpanded && (
          <div className="mt-4 space-y-4">
            <form onSubmit={addCategoria} className="flex flex-col sm:flex-row gap-2">
              <Input
                value={catNome}
                onChange={(e) => setCatNome(e.target.value)}
                placeholder="Nome da categoria (ex: Anéis)"
                className="flex-1"
              />
              <Button type="submit" disabled={addingCat} className="bg-rosa hover:bg-rosa/90">
                {addingCat ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Criar
              </Button>
            </form>

            {categorias.length === 0 ? (
              <p className="text-sm text-ink-soft text-center py-2">Nenhuma categoria cadastrada.</p>
            ) : (
              <div className="space-y-1">
                {categorias.map((cat) => {
                  const count = produtos.filter((p) => p.categoria_id === cat.id).length;
                  return (
                    <div
                      key={cat.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl border border-border"
                    >
                      <span className="text-sm text-ink flex-1">{cat.nome}</span>
                      <span className="text-xs text-ink-soft">{count} produto{count !== 1 ? 's' : ''}</span>
                      <button
                        onClick={() => excluirCategoria(cat)}
                        className="text-destructive hover:bg-destructive/10 p-1.5 rounded-md"
                        title="Excluir categoria"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Novo Produto ── */}
      <section className="bg-white rounded-2xl border border-bege p-5">
        <h3 className="font-serif text-xl text-ink mb-4">Novo Produto</h3>
        <form onSubmit={add} className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Seleção de categoria */}
            <select
              value={catSelecionada}
              onChange={(e) => onCategoriaChange(e.target.value)}
              className="border border-input bg-background rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-rosa/40 sm:w-48"
            >
              <option value="">Sem categoria</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nome} ({cat.prefixo})
                </option>
              ))}
            </select>

            {/* SKU — pré-preenchido com prefixo da categoria */}
            <Input
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              placeholder="SKU (gerado automaticamente)"
              className="sm:w-44 font-mono"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do produto"
              className="flex-1"
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              value={precoVenda}
              onChange={(e) => setPrecoVenda(e.target.value)}
              placeholder="Preço (R$)"
              className="sm:w-32"
            />
            <Button type="submit" disabled={adding} className="bg-rosa hover:bg-rosa/90">
              {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Adicionar
            </Button>
          </div>
        </form>
      </section>

      {/* ── Catálogo agrupado por categoria ── */}
      <section className="bg-white rounded-2xl border border-bege p-5">
        <h3 className="font-serif text-xl text-ink mb-4">Catálogo ({totalProdutos})</h3>

        <div className="space-y-4">
          {/* Grupos por categoria */}
          {grupos.map(({ cat, prods }) => {
            if (prods.length === 0) return null;
            const isCollapsed = collapsed[cat.id];
            return (
              <div key={cat.id}>
                <button
                  onClick={() => toggleCollapsed(cat.id)}
                  className="flex items-center gap-2 w-full text-left mb-2 group"
                >
                  {isCollapsed ? (
                    <ChevronRight size={14} className="text-ink-soft" />
                  ) : (
                    <ChevronDown size={14} className="text-ink-soft" />
                  )}
                  <span className="text-sm font-semibold text-ink">{cat.nome}</span>
                  <span className="text-xs text-ink-soft">({prods.length})</span>
                </button>

                {!isCollapsed && (
                  <div className="space-y-2 pl-4">
                    {prods.map((p) => (
                      <ProdutoRow
                        key={p.id}
                        p={p}
                        categorias={categorias}
                        editId={editId}
                        editForm={editForm}
                        setEditForm={setEditForm}
                        savingEdit={savingEdit}
                        onEdit={iniciarEdicao}
                        onSave={salvarEdicao}
                        onCancel={cancelarEdicao}
                        onToggle={toggleAtivo}
                        onDelete={excluir}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Produtos sem categoria */}
          {semCategoria.length > 0 && (
            <div>
              <button
                onClick={() => toggleCollapsed('__sem_cat__')}
                className="flex items-center gap-2 w-full text-left mb-2"
              >
                {collapsed['__sem_cat__'] ? (
                  <ChevronRight size={14} className="text-ink-soft" />
                ) : (
                  <ChevronDown size={14} className="text-ink-soft" />
                )}
                <span className="text-sm font-semibold text-ink-soft">Sem categoria</span>
                <span className="text-xs text-ink-soft">({semCategoria.length})</span>
              </button>

              {!collapsed['__sem_cat__'] && (
                <div className="space-y-2 pl-4">
                  {semCategoria.map((p) => (
                    <ProdutoRow
                      key={p.id}
                      p={p}
                      categorias={categorias}
                      editId={editId}
                      editForm={editForm}
                      setEditForm={setEditForm}
                      savingEdit={savingEdit}
                      onEdit={iniciarEdicao}
                      onSave={salvarEdicao}
                      onCancel={cancelarEdicao}
                      onToggle={toggleAtivo}
                      onDelete={excluir}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {totalProdutos === 0 && (
            <p className="text-sm text-ink-soft text-center py-4">Nenhum produto cadastrado.</p>
          )}
        </div>
      </section>
    </div>
  );
}

// ── Componente linha de produto ──────────────────────────────────────────────
type ProdutoRowProps = {
  p: Produto;
  categorias: Categoria[];
  editId: string | null;
  editForm: { nome: string; preco_venda: string; categoria_id: string };
  setEditForm: React.Dispatch<React.SetStateAction<{ nome: string; preco_venda: string; categoria_id: string }>>;
  savingEdit: boolean;
  onEdit: (p: Produto) => void;
  onSave: (p: Produto) => void;
  onCancel: () => void;
  onToggle: (p: Produto) => void;
  onDelete: (p: Produto) => void;
};

function ProdutoRow({
  p,
  categorias,
  editId,
  editForm,
  setEditForm,
  savingEdit,
  onEdit,
  onSave,
  onCancel,
  onToggle,
  onDelete,
}: ProdutoRowProps) {
  const isEditing = editId === p.id;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-border">
      <p className="font-mono text-xs text-rosa font-bold w-24 shrink-0">{p.sku}</p>

      {isEditing ? (
        <>
          <Input
            value={editForm.nome}
            onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
            className="flex-1"
            placeholder="Nome"
          />
          <Input
            type="number"
            step="0.01"
            min="0"
            value={editForm.preco_venda}
            onChange={(e) => setEditForm({ ...editForm, preco_venda: e.target.value })}
            className="sm:w-28"
            placeholder="Preço"
          />
          <select
            value={editForm.categoria_id}
            onChange={(e) => setEditForm({ ...editForm, categoria_id: e.target.value })}
            className="border border-input bg-background rounded-md px-2 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-rosa/40 sm:w-40"
          >
            <option value="">Sem categoria</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nome}
              </option>
            ))}
          </select>
          <Button
            size="icon"
            className="h-8 w-8 bg-rosa hover:bg-rosa/90 shrink-0"
            disabled={savingEdit}
            onClick={() => onSave(p)}
          >
            {savingEdit ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={onCancel}>
            <X size={14} />
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-ink flex-1 truncate">{p.nome}</p>
          <p className="text-sm text-ink-soft font-medium sm:w-24 sm:text-right shrink-0">
            R$ {(p.preco_venda ?? 0).toFixed(2)}
          </p>
          <button
            onClick={() => onToggle(p)}
            className={`text-[10px] uppercase tracking-wider px-3 py-1 rounded-full font-semibold transition-colors shrink-0 ${
              p.ativo
                ? 'bg-rosa/10 text-rosa hover:bg-rosa/20'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {p.ativo ? 'Ativo' : 'Inativo'}
          </button>
          <button
            onClick={() => onEdit(p)}
            className="text-ink-soft hover:bg-bege-light p-2 rounded-md shrink-0"
            title="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(p)}
            className="text-destructive hover:bg-destructive/10 p-2 rounded-md shrink-0"
            title="Excluir"
          >
            <Trash2 size={14} />
          </button>
        </>
      )}
    </div>
  );
}
