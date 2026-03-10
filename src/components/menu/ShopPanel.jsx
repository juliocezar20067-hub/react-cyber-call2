import { useEffect, useMemo, useState } from 'react';
import { getCharacterProfile } from '../../constants/characterProfiles';
import {
  CATEGORY_FILTERS,
  INVENTORY_CATEGORY_DEFAULTS,
  NON_INVENTORY_CATEGORIES,
  PRICE_TIERS,
  SHOP_ITEMS,
  SOURCE_FILTERS,
} from '../../constants/shopCatalog';
import { getStoredState, setStoredState, subscribeStoredState } from '../../lib/stateStorage';
import { playSound } from '../../sound/soundSystem';
import './Menu.css';

const SORT_OPTIONS = [
  { id: 'name', label: 'Nome' },
  { id: 'price', label: 'Preco' },
  { id: 'category', label: 'Categoria' },
];

function findLabel(list, id) {
  return list.find((item) => item.id === id)?.label ?? id;
}

export default function ShopPanel({ onBack, playerId, campaignId, role }) {
  const profile = useMemo(() => getCharacterProfile(playerId), [playerId]);
  const level = profile?.level ?? 0;
  const cred = Math.max(1, Math.floor(level / 2) + 1);
  const isMaster = role === 'master';
  const baseItemIds = useMemo(() => new Set(SHOP_ITEMS.map((item) => item.id)), []);

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [purchaseStatus, setPurchaseStatus] = useState('');
  const [customItems, setCustomItems] = useState([]);
  const [catalogHydrated, setCatalogHydrated] = useState(false);

  const [showEditor, setShowEditor] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('gear');
  const [editPriceTier, setEditPriceTier] = useState('premium');
  const [editPriceEb, setEditPriceEb] = useState('100');
  const [editPriceNote, setEditPriceNote] = useState('');
  const [editSource, setEditSource] = useState('loja');
  const [editDescription, setEditDescription] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editGridW, setEditGridW] = useState('');
  const [editGridH, setEditGridH] = useState('');
  const [editColor, setEditColor] = useState('');

  useEffect(() => {
    if (!campaignId) {
      setCustomItems([]);
      setCatalogHydrated(false);
      return;
    }

    const unsubscribe = subscribeStoredState({
      campaignId,
      playerId: '__system__',
      scope: 'shop_catalog_custom',
      fallback: [],
      onChange: (data) => {
        setCustomItems(Array.isArray(data) ? data : []);
        setCatalogHydrated(true);
      },
    });

    return unsubscribe;
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId || !catalogHydrated || !isMaster) return;
    setStoredState({
      campaignId,
      playerId: '__system__',
      scope: 'shop_catalog_custom',
      data: customItems,
    });
  }, [campaignId, catalogHydrated, customItems, isMaster]);

  const mergedItems = useMemo(() => {
    if (!customItems.length) return SHOP_ITEMS;
    const overrides = new Map(customItems.map((item) => [item.id, item]));
    const base = SHOP_ITEMS.map((item) => (overrides.has(item.id) ? { ...item, ...overrides.get(item.id) } : item));
    const extra = customItems.filter((item) => !baseItemIds.has(item.id));
    return [...extra, ...base];
  }, [baseItemIds, customItems]);

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return mergedItems.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (priceFilter !== 'all' && item.priceTier !== priceFilter) return false;
      if (sourceFilter !== 'all' && item.source !== sourceFilter) return false;
      if (!query) return true;

      const nameMatch = item.name?.toLowerCase().includes(query);
      const descMatch = item.description?.toLowerCase().includes(query);
      return nameMatch || descMatch;
    });
  }, [categoryFilter, mergedItems, priceFilter, searchTerm, sourceFilter]);

  const sortedItems = useMemo(() => {
    const items = [...filteredItems];
    items.sort((a, b) => {
      let compare = 0;
      if (sortBy === 'price') {
        compare = (a.priceEb ?? 0) - (b.priceEb ?? 0);
      } else if (sortBy === 'category') {
        compare = (a.category ?? '').localeCompare(b.category ?? '');
      } else {
        compare = (a.name ?? '').localeCompare(b.name ?? '');
      }
      return sortDir === 'asc' ? compare : -compare;
    });
    return items;
  }, [filteredItems, sortBy, sortDir]);

  const handleBack = () => {
    playSound('button');
    onBack();
  };

  const resetEditor = () => {
    setEditingItemId(null);
    setEditName('');
    setEditCategory('gear');
    setEditPriceTier('premium');
    setEditPriceEb('100');
    setEditPriceNote('');
    setEditSource('loja');
    setEditDescription('');
    setEditImageUrl('');
    setEditGridW('');
    setEditGridH('');
    setEditColor('');
  };

  const openNewItemEditor = () => {
    playSound('button');
    resetEditor();
    setShowEditor(true);
  };

  const openEditItemEditor = (item) => {
    playSound('button');
    setEditingItemId(item.id);
    setEditName(item.name ?? '');
    setEditCategory(item.category ?? 'gear');
    setEditPriceTier(item.priceTier ?? 'premium');
    setEditPriceEb(String(item.priceEb ?? ''));
    setEditPriceNote(item.priceNote ?? '');
    setEditSource(item.source ?? 'loja');
    setEditDescription(item.description ?? '');
    setEditImageUrl(item.imageUrl ?? '');
    setEditGridW(item.grid?.w != null ? String(item.grid.w) : '');
    setEditGridH(item.grid?.h != null ? String(item.grid.h) : '');
    setEditColor(item.color ?? '');
    setShowEditor(true);
  };

  const closeEditor = () => {
    playSound('button');
    setShowEditor(false);
    resetEditor();
  };

  const handleSaveEditor = () => {
    if (!isMaster) return;
    if (!editName.trim()) return;
    playSound('button');
    const id = editingItemId || `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const gridW = Number(editGridW);
    const gridH = Number(editGridH);
    const nextItem = {
      id,
      name: editName.trim(),
      category: editCategory,
      priceTier: editPriceTier,
      priceEb: Number(editPriceEb) || 0,
      priceNote: editPriceNote.trim() || undefined,
      source: editSource || undefined,
      description: editDescription.trim(),
      imageUrl: editImageUrl.trim() || undefined,
      color: editColor.trim() || undefined,
      grid: Number.isFinite(gridW) && Number.isFinite(gridH) && gridW > 0 && gridH > 0
        ? { w: gridW, h: gridH }
        : undefined,
    };

    setCustomItems((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      return [nextItem, ...filtered];
    });
    setShowEditor(false);
    resetEditor();
  };

  const handleRemoveCustomization = (itemId) => {
    if (!isMaster) return;
    playSound('button');
    setCustomItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const resolveInventoryConfig = (item) => {
    if (NON_INVENTORY_CATEGORIES.includes(item.category)) return null;
    const base = INVENTORY_CATEGORY_DEFAULTS[item.category];
    const grid = item.grid ?? base;
    if (!grid) return null;
    return {
      w: grid.w,
      h: grid.h,
      color: item.color ?? grid.color ?? base?.color ?? '#4d80ff',
    };
  };

  const handlePurchase = async (item) => {
    if (!item || !playerId || !campaignId) return;
    playSound('button');

    const inventoryData = await getStoredState({
      campaignId,
      playerId,
      scope: 'inventory_grid',
      fallback: { gridCols: 10, gridRows: 6, items: [], possessions: [] },
    });

    const gridCols = Number(inventoryData?.gridCols) || 10;
    const gridRows = Number(inventoryData?.gridRows) || 6;
    const currentItems = Array.isArray(inventoryData?.items) ? inventoryData.items : [];
    const currentPossessions = Array.isArray(inventoryData?.possessions) ? inventoryData.possessions : [];

    const gridConfig = resolveInventoryConfig(item);
    const nextItems = [...currentItems];
    if (gridConfig) {
      const index = nextItems.length;
      nextItems.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        itemId: item.id,
        name: item.name,
        w: gridConfig.w,
        h: gridConfig.h,
        rotated: false,
        color: gridConfig.color,
        imageUrl: item.imageUrl ?? '',
        location: 'pool',
        x: 10 + (index % 4) * 14,
        y: 10 + (index % 6) * 14,
      });
    }

    const nextPossessions = [...currentPossessions];
    const existingIndex = nextPossessions.findIndex((entry) => entry.itemId === item.id);
    if (existingIndex >= 0) {
      const existing = nextPossessions[existingIndex];
      nextPossessions[existingIndex] = {
        ...existing,
        quantity: (Number(existing.quantity) || 1) + 1,
      };
    } else {
      nextPossessions.unshift({
        id: item.id,
        itemId: item.id,
        name: item.name,
        category: findLabel(CATEGORY_FILTERS, item.category),
        priceEb: item.priceEb ?? 0,
        priceTier: item.priceTier ?? '',
        source: item.source ?? '',
        quantity: 1,
        grid: gridConfig ? { w: gridConfig.w, h: gridConfig.h } : null,
        imageUrl: item.imageUrl ?? '',
      });
    }

    setStoredState({
      campaignId,
      playerId,
      scope: 'inventory_grid',
      data: {
        gridCols,
        gridRows,
        items: nextItems,
        possessions: nextPossessions,
      },
    });

    setPurchaseStatus(`Item comprado: ${item.name}`);
    window.setTimeout(() => setPurchaseStatus(''), 2200);
  };

  const handleSelectFilter = (setter, value) => {
    playSound('button');
    setter(value);
  };

  const resetFilters = () => {
    playSound('button');
    setCategoryFilter('all');
    setPriceFilter('all');
    setSourceFilter('all');
    setSearchTerm('');
    setSortBy('name');
    setSortDir('asc');
  };

  const canPurchase = Boolean(playerId && campaignId);

  return (
    <div className="menu-shell shop-shell">
      <div className="panel-header-row">
        <h2 className="menu-title">Loja</h2>
        <button className="menu-back" onClick={handleBack}>VOLTAR</button>
      </div>

      <div className="shop-top-bar">
        <div className="shop-stat">
          <span className="shop-stat-label">Nivel</span>
          <span className="shop-stat-value">{level}</span>
        </div>
        <div className="shop-stat">
          <span className="shop-stat-label">Credibilidade</span>
          <span className="shop-stat-value">{cred}</span>
        </div>
        <div className="shop-stat">
          <span className="shop-stat-label">Catalogo</span>
          <span className="shop-stat-value">{sortedItems.length}</span>
        </div>
      </div>

      <div className="shop-layout">
        <div className="shop-filter-panel">
          <div className="shop-filter-title">Filtros</div>

          <div className="shop-filter-group">
            <div className="shop-filter-label">Categoria</div>
            <div className="shop-filter-chips">
              {CATEGORY_FILTERS.map((category) => (
                <button
                  key={category.id}
                  className={`shop-filter-chip ${categoryFilter === category.id ? 'is-active' : ''}`}
                  onClick={() => handleSelectFilter(setCategoryFilter, category.id)}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          <div className="shop-filter-group">
            <div className="shop-filter-label">Preco</div>
            <div className="shop-filter-chips">
              <button
                className={`shop-filter-chip ${priceFilter === 'all' ? 'is-active' : ''}`}
                onClick={() => handleSelectFilter(setPriceFilter, 'all')}
              >
                Todos
              </button>
              {PRICE_TIERS.map((tier) => (
                <button
                  key={tier.id}
                  className={`shop-filter-chip ${priceFilter === tier.id ? 'is-active' : ''}`}
                  onClick={() => handleSelectFilter(setPriceFilter, tier.id)}
                >
                  {tier.label}
                </button>
              ))}
            </div>
          </div>

          <div className="shop-filter-group">
            <div className="shop-filter-label">Origem</div>
            <select
              className="shop-select"
              value={sourceFilter}
              onChange={(event) => handleSelectFilter(setSourceFilter, event.target.value)}
            >
              {SOURCE_FILTERS.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.label}
                </option>
              ))}
            </select>
          </div>

          <div className="shop-filter-group">
            <div className="shop-filter-label">Busca rapida</div>
            <input
              className="shop-search"
              placeholder="Digite o nome ou descricao"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <button className="shop-reset-btn" onClick={resetFilters}>RESETAR FILTROS</button>
          {purchaseStatus ? <div className="shop-purchase-status">{purchaseStatus}</div> : null}
          {isMaster ? (
            <button className="shop-reset-btn" onClick={openNewItemEditor}>+ ADICIONAR ITEM</button>
          ) : null}
        </div>

        <div className="shop-results">
          <div className="shop-toolbar">
            <div className="shop-sort">
              <label className="shop-filter-label">Organizacao</label>
              <div className="shop-sort-row">
                <select
                  className="shop-select"
                  value={sortBy}
                  onChange={(event) => {
                    playSound('button');
                    setSortBy(event.target.value);
                  }}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  className="shop-sort-btn"
                  onClick={() => {
                    playSound('button');
                    setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                  }}
                >
                  {sortDir === 'asc' ? 'ASC' : 'DESC'}
                </button>
              </div>
            </div>
          </div>

          <div className="shop-grid">
            {sortedItems.length === 0 ? (
              <div className="placeholder-box">Nenhum item encontrado com esses filtros.</div>
            ) : null}
            {sortedItems.map((item) => {
              const gridConfig = resolveInventoryConfig(item);
              return (
                <div className="shop-card" key={item.id}>
                  <div className="shop-card-grid">
                    {gridConfig ? `Grid: ${gridConfig.w}x${gridConfig.h}` : 'Sem grid'}
                  </div>
                  {item.imageUrl ? (
                    <img className="shop-card-image" src={item.imageUrl} alt={item.name} />
                  ) : null}
                <div className="shop-card-header">
                  <div className="shop-card-title">{item.name}</div>
                  <div className={`shop-tier-tag tier-${item.priceTier}`}>
                    {findLabel(PRICE_TIERS, item.priceTier)}
                  </div>
                </div>
                <div className="shop-card-meta">
                  {findLabel(CATEGORY_FILTERS, item.category)}
                  {item.source ? ` - ${findLabel(SOURCE_FILTERS, item.source)}` : ''}
                </div>
                <div className="shop-card-desc">{item.description}</div>
                <div className="shop-card-footer">
                  <span className="shop-price">E$ {item.priceEb}</span>
                  {item.priceNote ? <span className="shop-price-note">{item.priceNote}</span> : null}
                </div>
                <button
                  className="shop-buy-btn"
                  onClick={() => handlePurchase(item)}
                  disabled={!canPurchase}
                >
                  {canPurchase ? 'COMPRAR' : 'SEM PERFIL'}
                </button>
                {isMaster ? (
                  <div className="shop-admin-actions">
                    <button className="shop-buy-btn" onClick={() => openEditItemEditor(item)}>
                      EDITAR
                    </button>
                    {baseItemIds.has(item.id) ? (
                      <button className="shop-buy-btn" onClick={() => handleRemoveCustomization(item.id)}>
                        RESETAR PADRAO
                      </button>
                    ) : (
                      <button className="shop-buy-btn" onClick={() => handleRemoveCustomization(item.id)}>
                        EXCLUIR
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
              );
            })}
          </div>
        </div>
      </div>

      {showEditor ? (
        <div className="shop-edit-overlay" onClick={closeEditor}>
          <div className="shop-edit-modal" onClick={(event) => event.stopPropagation()}>
            <div className="shop-edit-title">{editingItemId ? 'Editar item' : 'Adicionar item'}</div>
            <div className="shop-edit-grid">
              <input
                className="entry-input"
                placeholder="Nome do item"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
              />
              <select
                className="entry-input"
                value={editCategory}
                onChange={(event) => setEditCategory(event.target.value)}
              >
                {CATEGORY_FILTERS.filter((cat) => cat.id !== 'all').map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
              <select
                className="entry-input"
                value={editPriceTier}
                onChange={(event) => setEditPriceTier(event.target.value)}
              >
                {PRICE_TIERS.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.label}
                  </option>
                ))}
              </select>
              <input
                className="entry-input"
                placeholder="Preco (E$)"
                value={editPriceEb}
                onChange={(event) => setEditPriceEb(event.target.value)}
              />
              <input
                className="entry-input"
                placeholder="Nota de preco (opcional)"
                value={editPriceNote}
                onChange={(event) => setEditPriceNote(event.target.value)}
              />
              <select
                className="entry-input"
                value={editSource}
                onChange={(event) => setEditSource(event.target.value)}
              >
                {SOURCE_FILTERS.filter((source) => source.id !== 'all').map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.label}
                  </option>
                ))}
              </select>
              <input
                className="entry-input"
                placeholder="Descricao"
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
              />
              <input
                className="entry-input"
                placeholder="Link da imagem (opcional)"
                value={editImageUrl}
                onChange={(event) => setEditImageUrl(event.target.value)}
              />
              <input
                className="entry-input"
                placeholder="Grid W (opcional)"
                value={editGridW}
                onChange={(event) => setEditGridW(event.target.value)}
              />
              <input
                className="entry-input"
                placeholder="Grid H (opcional)"
                value={editGridH}
                onChange={(event) => setEditGridH(event.target.value)}
              />
              <input
                className="entry-input"
                placeholder="Cor (opcional)"
                value={editColor}
                onChange={(event) => setEditColor(event.target.value)}
              />
            </div>
            {editImageUrl ? (
              <img className="entry-image-preview" src={editImageUrl} alt="Preview" />
            ) : null}
            <div className="shop-edit-actions">
              <button className="shop-buy-btn" onClick={handleSaveEditor}>SALVAR</button>
              <button className="shop-buy-btn" onClick={closeEditor}>CANCELAR</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
