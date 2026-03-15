import { useEffect, useMemo, useRef, useState } from 'react';
import { playSound, stopSound } from '../../sound/soundSystem';
import { setStoredState, subscribeStoredState } from '../../lib/stateStorage';
import {
  CATEGORY_FILTERS,
  INVENTORY_CATEGORY_DEFAULTS,
  PRICE_TIERS,
  SHOP_ITEMS,
  SOURCE_FILTERS,
} from '../../constants/shopCatalog';
import './Menu.css';

const CELL_SIZE = 46;
const MIN_GRID = 3;
const MAX_GRID = 16;
const LONG_PRESS_MS = 1000;
const DRAG_THRESHOLD = 6;
const IMAGE_ALPHA_THRESHOLD = 8;
const IMAGE_TRIM_PADDING = 2;
function itemDims(item, rotated = item.rotated) {
  return rotated ? { w: item.h, h: item.w } : { w: item.w, h: item.h };
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function isValidPlacement(items, movingId, x, y, w, h, cols, rows) {
  if (x < 0 || y < 0 || x + w > cols || y + h > rows) return false;

  const movingRect = { x, y, w, h };
  for (const item of items) {
    if (item.id === movingId || item.location !== 'grid') continue;
    const dims = itemDims(item);
    const itemRect = { x: item.x, y: item.y, w: dims.w, h: dims.h };
    if (rectsOverlap(movingRect, itemRect)) return false;
  }
  return true;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

async function trimTransparentEdges(src) {
  if (!src) return null;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  const loadPromise = new Promise((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('failed'));
  });
  img.src = src;
  await loadPromise;

  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) return null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { src, w: width, h: height };

  ctx.drawImage(img, 0, 0);
  let imageData;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch {
    return { src, w: width, h: height };
  }
  const data = imageData.data;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      const alpha = data[idx + 3];
      if (alpha > IMAGE_ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return { src, w: width, h: height };
  }

  minX = Math.max(0, minX - IMAGE_TRIM_PADDING);
  minY = Math.max(0, minY - IMAGE_TRIM_PADDING);
  maxX = Math.min(width - 1, maxX + IMAGE_TRIM_PADDING);
  maxY = Math.min(height - 1, maxY + IMAGE_TRIM_PADDING);

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  if (cropW <= 0 || cropH <= 0) return { src, w: width, h: height };

  const outCanvas = document.createElement('canvas');
  outCanvas.width = cropW;
  outCanvas.height = cropH;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) return { src, w: width, h: height };
  outCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

  return { src: outCanvas.toDataURL('image/png'), w: cropW, h: cropH };
}

function resolveImageInfo(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') {
    return { src: entry, w: null, h: null };
  }
  return entry;
}

function buildImageWrapStyle(innerW, innerH, rotated) {
  if (!rotated) {
    return {
      position: 'absolute',
      inset: '3px',
      width: `${innerW}px`,
      height: `${innerH}px`,
    };
  }

  return {
    position: 'absolute',
    width: `${innerH}px`,
    height: `${innerW}px`,
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%) rotate(90deg)',
  };
}

function parsePackSize(text) {
  if (!text) return 1;
  const match = String(text).match(/(\d+)/);
  if (!match) return 1;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function resolveAmmoPackSize(item, fallbackNote) {
  if (!item) return parsePackSize(fallbackNote);
  return parsePackSize(item.priceNote) || 1;
}

function findCatalogItem(catalogItems, itemId) {
  if (!itemId) return null;
  return catalogItems.find((entry) => entry.id === itemId) ?? null;
}

function expandAmmoStacks(rawItems, catalogItems) {
  const expanded = [];
  rawItems.forEach((item, index) => {
    const catalog = findCatalogItem(catalogItems, item.itemId);
    if (catalog?.category !== 'ammo') {
      expanded.push(item);
      return;
    }
    const packSize = resolveAmmoPackSize(catalog, catalog?.priceNote);
    const total = Math.max(1, Number(item.stackQty) || 1);
    if (total <= packSize) {
      expanded.push({
        ...item,
        stackQty: total,
      });
      return;
    }
    const packs = Math.ceil(total / packSize);
    for (let i = 0; i < packs; i += 1) {
      const qty = i === packs - 1 ? total - packSize * (packs - 1) : packSize;
      const isFirst = i === 0;
      expanded.push({
        ...item,
        id: isFirst ? item.id : `${item.id ?? item.itemId ?? `ammo-${index}`}-${i}-${Date.now()}`,
        stackQty: qty,
        location: isFirst ? item.location : 'pool',
        x: isFirst ? item.x : 10 + ((expanded.length + i) % 4) * 14,
        y: isFirst ? item.y : 10 + ((expanded.length + i) % 6) * 14,
      });
    }
  });
  return expanded;
}

function buildPossessionsFromItems(items, catalogItems, previous = []) {
  const prevMap = new Map(
    previous.map((entry) => [entry.itemId || entry.name, entry])
  );
  const map = new Map();

  items.forEach((item) => {
    const key = item.itemId || item.name;
    const catalog = findCatalogItem(catalogItems, item.itemId);
    const prev = prevMap.get(key);
    const categoryId = catalog?.category ?? '';
    const stackQty = Math.max(1, Number(item.stackQty) || 1);
    const entry =
      map.get(key) || {
        id: prev?.id ?? item.itemId ?? item.id ?? key,
        itemId: item.itemId ?? '',
        name: item.name ?? catalog?.name ?? 'Item',
        quantity: 0,
        category: prev?.category ?? (categoryId ? CATEGORY_FILTERS.find((cat) => cat.id === categoryId)?.label ?? categoryId : ''),
        priceEb: prev?.priceEb ?? catalog?.priceEb ?? 0,
        priceTier: prev?.priceTier ?? catalog?.priceTier ?? '',
        source: prev?.source ?? catalog?.source ?? '',
        grid:
          prev?.grid ??
          catalog?.grid ??
          (item.w && item.h ? { w: item.w, h: item.h } : null),
        imageUrl: prev?.imageUrl ?? item.imageUrl ?? catalog?.imageUrl ?? '',
        equipped: prev?.equipped ?? false,
      };
    entry.quantity += stackQty;
    map.set(key, entry);
  });

  return Array.from(map.values());
}

export default function InventoryPanel({ onBack, campaignId, playerId }) {
  const inventoryRef = useRef(null);
  const poolRef = useRef(null);
  const baseItemIds = useMemo(() => new Set(SHOP_ITEMS.map((item) => item.id)), []);
  const pressRef = useRef(null);

  const [colsInput, setColsInput] = useState('10');
  const [rowsInput, setRowsInput] = useState('6');
  const [gridCols, setGridCols] = useState(10);
  const [gridRows, setGridRows] = useState(6);
  const [items, setItems] = useState([]);
  const [possessions, setPossessions] = useState([]);
  const [cash, setCash] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [status, setStatus] = useState('');
  const [catalogItems, setCatalogItems] = useState(SHOP_ITEMS);
  const [detailItem, setDetailItem] = useState(null);
  const [trimmedImages, setTrimmedImages] = useState({});

  const [newName, setNewName] = useState('');
  const [newW, setNewW] = useState('3');
  const [newH, setNewH] = useState('2');
  const [newColor, setNewColor] = useState('#4d80ff');

  const [dragPreview, setDragPreview] = useState(null);
  const dragPreviewRef = useRef(null);
  const [gridPreview, setGridPreview] = useState(null);
  const gridPreviewRef = useRef(null);
  const lastGridCellRef = useRef(null);
  const [hydrated, setHydrated] = useState(false);

  const scope = useMemo(() => 'inventory_grid', []);

  useEffect(() => {
    dragPreviewRef.current = dragPreview;
  }, [dragPreview]);

  useEffect(() => {
    gridPreviewRef.current = gridPreview;
  }, [gridPreview]);

  useEffect(() => {
    if (!campaignId) {
      setCatalogItems(SHOP_ITEMS);
      return;
    }

    const unsubscribe = subscribeStoredState({
      campaignId,
      playerId: '__system__',
      scope: 'shop_catalog_custom',
      fallback: [],
      onChange: (data) => {
        const customItems = Array.isArray(data) ? data : [];
        if (customItems.length === 0) {
          setCatalogItems(SHOP_ITEMS);
          return;
        }

        const overrides = new Map(customItems.map((item) => [item.id, item]));
        const base = SHOP_ITEMS.map((item) => (overrides.has(item.id) ? { ...item, ...overrides.get(item.id) } : item));
        const extra = customItems.filter((item) => !baseItemIds.has(item.id));
        setCatalogItems([...extra, ...base]);
      },
    });

    return unsubscribe;
  }, [baseItemIds, campaignId]);

  useEffect(() => {
    if (!campaignId || !playerId) return;

    const unsubscribe = subscribeStoredState({
      campaignId,
      playerId,
      scope,
      fallback: null,
      onChange: (parsed) => {
        const cols = Number(parsed?.gridCols);
        const rows = Number(parsed?.gridRows);
        const loadedItems = Array.isArray(parsed?.items) ? parsed.items : [];
        const loadedPossessions = Array.isArray(parsed?.possessions) ? parsed.possessions : [];
        const loadedCash = Number(parsed?.cash);

        if (Number.isFinite(cols) && Number.isFinite(rows)) {
          setGridCols(clamp(Math.floor(cols), MIN_GRID, MAX_GRID));
          setGridRows(clamp(Math.floor(rows), MIN_GRID, MAX_GRID));
          setColsInput(String(clamp(Math.floor(cols), MIN_GRID, MAX_GRID)));
          setRowsInput(String(clamp(Math.floor(rows), MIN_GRID, MAX_GRID)));
        }

        const normalizedItems = expandAmmoStacks(
          loadedItems.map((item) => ({
            id: item.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            itemId: item.itemId ?? '',
            name: item.name ?? 'Item',
            w: Math.max(1, Math.floor(item.w ?? 1)),
            h: Math.max(1, Math.floor(item.h ?? 1)),
            rotated: Boolean(item.rotated),
            stackQty: Number(item.stackQty) || 1,
            color: item.color ?? '#4d80ff',
            imageUrl: item.imageUrl ?? '',
            location: item.location === 'grid' ? 'grid' : 'pool',
            x: Number.isFinite(item.x) ? item.x : 10,
            y: Number.isFinite(item.y) ? item.y : 10,
          })),
          catalogItems
        );

        setItems(normalizedItems);

        setPossessions(
          buildPossessionsFromItems(normalizedItems, catalogItems, loadedPossessions)
        );
        setCash(Number.isFinite(loadedCash) ? loadedCash : 0);
        setHydrated(true);
      },
    });

    return unsubscribe;
  }, [campaignId, playerId, scope]);

  useEffect(() => {
    let cancelled = false;
    const sources = Array.from(
      new Set(
        items
          .map((item) => item.imageUrl)
          .filter((url) => typeof url === 'string' && url.trim())
      )
    );

    sources.forEach((url) => {
      if (trimmedImages[url] !== undefined) return;
      trimTransparentEdges(url)
        .then((trimmed) => {
          if (cancelled) return;
          setTrimmedImages((prev) => ({ ...prev, [url]: trimmed || null }));
        })
        .catch(() => {
          if (cancelled) return;
          setTrimmedImages((prev) => ({ ...prev, [url]: null }));
        });
    });

    return () => {
      cancelled = true;
    };
  }, [items, trimmedImages]);

  useEffect(() => {
    if (!campaignId || !playerId || !hydrated) return;
    setStoredState({
      campaignId,
      playerId,
      scope,
      data: {
        gridCols,
        gridRows,
        items,
        possessions,
        cash,
      },
    });
  }, [campaignId, cash, gridCols, gridRows, hydrated, items, playerId, possessions, scope]);

  useEffect(() => {
    if (!hydrated) return;
    setPossessions((prev) => buildPossessionsFromItems(items, catalogItems, prev));
  }, [catalogItems, hydrated, items]);

  useEffect(() => {
    const handlePressMove = (event) => {
      const press = pressRef.current;
      if (!press || dragPreview) return;

      const dx = event.clientX - press.startX;
      const dy = event.clientY - press.startY;
      const distance = Math.hypot(dx, dy);
      if (distance < DRAG_THRESHOLD) return;

      if (press.timerId) {
        clearTimeout(press.timerId);
      }
      pressRef.current = null;
      startDragFrom(press.element, event, press.item);
    };

    const handlePressUp = () => {
      const press = pressRef.current;
      if (!press) return;
      if (press.timerId) {
        clearTimeout(press.timerId);
      }
      pressRef.current = null;
    };

    window.addEventListener('mousemove', handlePressMove);
    window.addEventListener('mouseup', handlePressUp);
    return () => {
      window.removeEventListener('mousemove', handlePressMove);
      window.removeEventListener('mouseup', handlePressUp);
    };
  }, [dragPreview]);

  useEffect(() => {
    if (!dragPreview) return undefined;

    const handleMove = (event) => {
      setDragPreview((prev) =>
        prev
          ? {
              ...prev,
              mouseX: event.clientX,
              mouseY: event.clientY,
            }
          : prev
      );
    };

    const handleRotation = (event) => {
      if (event.key.toLowerCase() !== 'r') return;
      setDragPreview((prev) => (prev ? { ...prev, rotation: !prev.rotation } : prev));
    };

    const handleUp = (event) => {
      const preview = dragPreviewRef.current;
      if (!preview) return;

      const item = items.find((entry) => entry.id === preview.itemId);
      if (!item) {
        stopSound('inventoryMove');
        setDragPreview(null);
        setGridPreview(null);
        lastGridCellRef.current = null;
        return;
      }

      const dims = itemDims(item, preview.rotation);
      const invRect = inventoryRef.current?.getBoundingClientRect();
      const poolRect = poolRef.current?.getBoundingClientRect();
      const dropX = event.clientX - preview.offsetX;
      const dropY = event.clientY - preview.offsetY;

      let handled = false;
      if (invRect && event.clientX >= invRect.left && event.clientX <= invRect.right && event.clientY >= invRect.top && event.clientY <= invRect.bottom) {
        const relX = dropX - invRect.left;
        const relY = dropY - invRect.top;
        const gridX = Math.round(relX / CELL_SIZE);
        const gridY = Math.round(relY / CELL_SIZE);
        if (isValidPlacement(items, item.id, gridX, gridY, dims.w, dims.h, gridCols, gridRows)) {
          setItems((prev) =>
            prev.map((entry) =>
              entry.id === item.id
                ? { ...entry, location: 'grid', x: gridX, y: gridY, rotated: preview.rotation }
                : entry
            )
          );
          handled = true;
        }
      } else if (
        poolRect &&
        event.clientX >= poolRect.left &&
        event.clientX <= poolRect.right &&
        event.clientY >= poolRect.top &&
        event.clientY <= poolRect.bottom
      ) {
        const maxX = Math.max(0, poolRect.width - dims.w * CELL_SIZE);
        const maxY = Math.max(0, poolRect.height - dims.h * CELL_SIZE);
        const relX = clamp(dropX - poolRect.left, 0, maxX);
        const relY = clamp(dropY - poolRect.top, 0, maxY);
        setItems((prev) =>
          prev.map((entry) =>
            entry.id === item.id
              ? { ...entry, location: 'pool', x: relX, y: relY, rotated: preview.rotation }
              : entry
          )
        );
        handled = true;
      }

      if (!handled) {
        setItems((prev) =>
          prev.map((entry) =>
            entry.id === item.id
              ? { ...entry, ...preview.startState }
              : entry
          )
        );
      }

      stopSound('inventoryMove');
      playSound('inventoryDrop', { volume: 0.8 });
      setDragPreview(null);
      setGridPreview(null);
      lastGridCellRef.current = null;
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.addEventListener('keydown', handleRotation);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('keydown', handleRotation);
    };
  }, [dragPreview, gridCols, gridRows, items]);

  useEffect(() => {
    if (!dragPreview) {
      stopSound('inventoryMove');
      setGridPreview(null);
      lastGridCellRef.current = null;
    }
  }, [dragPreview]);

  useEffect(() => () => {
    stopSound('inventoryMove');
  }, []);

  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
  const findLabel = (list, id) => list.find((item) => item.id === id)?.label ?? id;

  const handleBack = () => {
    playSound('button');
    onBack();
  };

  const handleOpenItemDetails = (item) => {
    if (!item?.itemId) return;
    const shopItem = catalogItems.find((entry) => entry.id === item.itemId);
    if (!shopItem) return;
    playSound('button');
    setDetailItem(shopItem);
  };

  const handleApplyGrid = () => {
    const nextCols = clamp(Number(colsInput) || 0, MIN_GRID, MAX_GRID);
    const nextRows = clamp(Number(rowsInput) || 0, MIN_GRID, MAX_GRID);
    const hasInvalidPlacedItem = items.some((item) => {
      if (item.location !== 'grid') return false;
      const dims = itemDims(item);
      return !isValidPlacement(items, item.id, item.x, item.y, dims.w, dims.h, nextCols, nextRows);
    });

    if (hasInvalidPlacedItem) {
      setStatus('Nao foi possivel reduzir o grid: existem itens sem espaco.');
      return;
    }

    playSound('button');
    setGridCols(nextCols);
    setGridRows(nextRows);
    setColsInput(String(nextCols));
    setRowsInput(String(nextRows));
    setStatus(`Grid atualizado para ${nextCols}x${nextRows}.`);
  };

  const handleAddItem = () => {
    const w = Math.max(1, Math.min(12, Number(newW) || 1));
    const h = Math.max(1, Math.min(12, Number(newH) || 1));
    const name = newName.trim() || `Item ${items.length + 1}`;

    playSound('button');
    setItems((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name,
        w,
        h,
        rotated: false,
        color: newColor,
        location: 'pool',
        x: 10 + (prev.length % 4) * 14,
        y: 10 + (prev.length % 6) * 14,
      },
    ]);

    setNewName('');
    setNewW('3');
    setNewH('2');
    setStatus(`Item "${name}" adicionado.`);
  };

  const handleSelectItem = (itemId) => {
    playSound('button');
    setSelectedItemId(itemId);
  };

  const handleDeleteSelected = () => {
    if (!selectedItem) return;
    playSound('button');
    setItems((prev) => prev.filter((item) => item.id !== selectedItem.id));
    setSelectedItemId(null);
    setStatus('Item removido.');
  };

  const handleClearInventory = () => {
    playSound('button');
    setItems([]);
    setPossessions([]);
    setSelectedItemId(null);
    setDragPreview(null);
    setGridPreview(null);
    lastGridCellRef.current = null;
    setStatus('Inventario limpo.');
  };

  const handleSellPossession = (entry) => {
    if (!entry) return;
    playSound('button');
    let didRemove = false;
    setItems((prev) => {
      const matchIndex = prev.findIndex((item) =>
        (entry.itemId && item.itemId === entry.itemId) || (!entry.itemId && item.name === entry.name)
      );
      if (matchIndex < 0) return prev;
      const next = [...prev];
      next.splice(matchIndex, 1);
      didRemove = true;
      return next;
    });

    if (!didRemove) {
      setStatus('Item nao encontrado no inventario.');
      return;
    }

    const catalogItem = findCatalogItem(catalogItems, entry.itemId);
    const sellValue = Number(entry.priceEb) || Number(catalogItem?.priceEb) || 0;
    if (sellValue) {
      setCash((prev) => prev + sellValue);
    }
    setStatus(`Item vendido: ${entry.name} (+E$ ${sellValue})`);
  };

  const handleAddPossession = (entry) => {
    if (!entry) return;
    playSound('button');
    const catalogItem = entry.itemId ? catalogItems.find((item) => item.id === entry.itemId) : null;
    const categoryId = catalogItem?.category ?? null;
    const isAmmo = catalogItem?.category === 'ammo';
    const packSize = resolveAmmoPackSize(catalogItem, entry.priceNote);
    const gridConfig =
      entry.grid ||
      catalogItem?.grid ||
      (categoryId ? INVENTORY_CATEGORY_DEFAULTS[categoryId] : null);

    if (isAmmo) {
      setItems((prev) => {
        const index = prev.length;
        return [
          ...prev,
          {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            itemId: entry.itemId ?? '',
            name: entry.name ?? 'Item',
            w: gridConfig?.w ?? 1,
            h: gridConfig?.h ?? 1,
            rotated: false,
            stackQty: packSize,
            color: catalogItem?.color ?? gridConfig?.color ?? '#4d80ff',
            imageUrl: entry.imageUrl ?? catalogItem?.imageUrl ?? '',
            location: 'pool',
            x: 10 + (index % 4) * 14,
            y: 10 + (index % 6) * 14,
          },
        ];
      });
    } else if (gridConfig) {
      setItems((prev) => {
        const index = prev.length;
        const nextItem = {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          itemId: entry.itemId ?? '',
          name: entry.name ?? 'Item',
          w: gridConfig.w,
          h: gridConfig.h,
          rotated: false,
          stackQty: 1,
          color: catalogItem?.color ?? gridConfig.color ?? '#4d80ff',
          imageUrl: entry.imageUrl ?? catalogItem?.imageUrl ?? '',
          location: 'pool',
          x: 10 + (index % 4) * 14,
          y: 10 + (index % 6) * 14,
        };
        return [...prev, nextItem];
      });
    } else {
      setItems((prev) => {
        const index = prev.length;
        return [
          ...prev,
          {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            itemId: entry.itemId ?? '',
            name: entry.name ?? 'Item',
            w: 1,
            h: 1,
            rotated: false,
            stackQty: 1,
            color: '#4d80ff',
            imageUrl: entry.imageUrl ?? '',
            location: 'pool',
            x: 10 + (index % 4) * 14,
            y: 10 + (index % 6) * 14,
          },
        ];
      });
    }

    setStatus(`Item adicionado: ${entry.name}`);
  };

  const handleToggleEquipped = (entry) => {
    if (!entry) return;
    playSound('button');
    setPossessions((prev) =>
      prev.map((item) =>
        item.id === entry.id ? { ...item, equipped: !item.equipped } : item
      )
    );
    setStatus(`${entry.equipped ? 'Desequipado' : 'Equipado'}: ${entry.name}`);
  };

  const handleRotateSelected = () => {
    if (!selectedItem) return;

    const nextRotated = !selectedItem.rotated;
    const dims = itemDims(selectedItem, nextRotated);
    if (
      selectedItem.location === 'grid' &&
      !isValidPlacement(items, selectedItem.id, selectedItem.x, selectedItem.y, dims.w, dims.h, gridCols, gridRows)
    ) {
      setStatus('Rotacao invalida nessa posicao.');
      return;
    }

    playSound('button');
    setItems((prev) =>
      prev.map((item) => (item.id === selectedItem.id ? { ...item, rotated: nextRotated } : item))
    );
  };

  const startDragFrom = (element, event, item) => {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    setSelectedItemId(item.id);
    playSound('inventoryPick', { volume: 0.85 });
    setDragPreview({
      itemId: item.id,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      mouseX: event.clientX,
      mouseY: event.clientY,
      rotation: item.rotated,
      startState: {
        location: item.location,
        x: item.x,
        y: item.y,
        rotated: item.rotated,
      },
    });
  };

  const handleItemMouseDown = (event, item) => {
    if (event.button !== 0) return;
    event.preventDefault();
    setSelectedItemId(item.id);

    const hasDetails = Boolean(item.itemId && catalogItems.find((entry) => entry.id === item.itemId));
    if (pressRef.current?.timerId) {
      clearTimeout(pressRef.current.timerId);
    }

    const timerId = hasDetails
      ? window.setTimeout(() => {
          pressRef.current = null;
          handleOpenItemDetails(item);
        }, LONG_PRESS_MS)
      : null;

    pressRef.current = {
      item,
      element: event.currentTarget,
      startX: event.clientX,
      startY: event.clientY,
      timerId,
    };
  };

  useEffect(() => {
    if (!dragPreview) {
      setGridPreview(null);
      lastGridCellRef.current = null;
      return;
    }

    const item = items.find((entry) => entry.id === dragPreview.itemId);
    if (!item) {
      setGridPreview(null);
      lastGridCellRef.current = null;
      return;
    }

    const dims = itemDims(item, dragPreview.rotation);
    const invRect = inventoryRef.current?.getBoundingClientRect();
    if (!invRect) {
      setGridPreview(null);
      lastGridCellRef.current = null;
      return;
    }

    const isInside =
      dragPreview.mouseX >= invRect.left &&
      dragPreview.mouseX <= invRect.right &&
      dragPreview.mouseY >= invRect.top &&
      dragPreview.mouseY <= invRect.bottom;

    if (!isInside) {
      setGridPreview(null);
      lastGridCellRef.current = null;
      return;
    }

    const dropX = dragPreview.mouseX - dragPreview.offsetX;
    const dropY = dragPreview.mouseY - dragPreview.offsetY;
    const relX = dropX - invRect.left;
    const relY = dropY - invRect.top;
    const gridX = Math.round(relX / CELL_SIZE);
    const gridY = Math.round(relY / CELL_SIZE);
    const valid = isValidPlacement(items, item.id, gridX, gridY, dims.w, dims.h, gridCols, gridRows);

    const lastCell = lastGridCellRef.current;
    if (!lastCell || lastCell.x !== gridX || lastCell.y !== gridY) {
      playSound('inventoryMove', { volume: 0.4, reset: true });
      lastGridCellRef.current = { x: gridX, y: gridY };
    }

    setGridPreview((prev) => {
      if (prev && prev.x === gridX && prev.y === gridY && prev.w === dims.w && prev.h === dims.h && prev.valid === valid) {
        return prev;
      }
      return {
        x: gridX,
        y: gridY,
        w: dims.w,
        h: dims.h,
        valid,
      };
    });
  }, [dragPreview, gridCols, gridRows, items]);

  const renderItem = (item) => {
    if (dragPreview?.itemId === item.id) return null;
    const dims = itemDims(item);
    const imageInfo = item.imageUrl ? resolveImageInfo(trimmedImages[item.imageUrl]) : null;
    const displayImage = imageInfo?.src || item.imageUrl || '';
    const innerW = dims.w * CELL_SIZE - 6;
    const innerH = dims.h * CELL_SIZE - 6;
    const imageWrapStyle = buildImageWrapStyle(innerW, innerH, item.rotated);
    const style = {
      width: `${dims.w * CELL_SIZE}px`,
      height: `${dims.h * CELL_SIZE}px`,
      left: `${item.x}px`,
      top: `${item.y}px`,
      background: item.imageUrl ? 'transparent' : item.color,
      zIndex: selectedItemId === item.id ? 3 : 1,
    };
    const displayQty = Number(item.stackQty) > 1 ? Number(item.stackQty) : null;
    return (
      <div
        key={item.id}
        className={`re4-item ${selectedItemId === item.id ? 'is-selected' : ''} ${item.imageUrl ? 'has-image' : ''}`}
        onMouseDown={(event) => handleItemMouseDown(event, item)}
        onClick={() => handleSelectItem(item.id)}
        style={style}
      >
        {displayImage ? (
          <div className="re4-item-image-wrap" style={imageWrapStyle}>
            <img
              className="re4-item-image"
              src={displayImage}
              alt={item.name}
            />
          </div>
        ) : null}
        <span className="re4-item-label">{item.name}</span>
        {displayQty ? <span className="re4-item-qty">{displayQty}</span> : null}
      </div>
    );
  };

  const dragItem = dragPreview ? items.find((item) => item.id === dragPreview.itemId) : null;
  const dragDims = dragItem ? itemDims(dragItem, dragPreview.rotation) : null;
  const dragImageInfo = dragItem?.imageUrl ? resolveImageInfo(trimmedImages[dragItem.imageUrl]) : null;
  const dragImage = dragImageInfo?.src || dragItem?.imageUrl || '';
  const dragInnerW = dragDims ? dragDims.w * CELL_SIZE - 6 : 0;
  const dragInnerH = dragDims ? dragDims.h * CELL_SIZE - 6 : 0;
  const dragImageWrapStyle = buildImageWrapStyle(dragInnerW, dragInnerH, Boolean(dragPreview?.rotation));

  return (
    <div className="menu-shell inventory-shell">
      <div className="panel-header-row">
        <h2 className="menu-title">Inventario</h2>
        <button className="menu-back" onClick={handleBack}>VOLTAR</button>
      </div>

      <div className="inventory-toolbar">
        <div className="inventory-toolbar-row">
          <input
            className="entry-input"
            value={colsInput}
            onChange={(event) => setColsInput(event.target.value)}
            placeholder="Colunas"
          />
          <input
            className="entry-input"
            value={rowsInput}
            onChange={(event) => setRowsInput(event.target.value)}
            placeholder="Linhas"
          />
          <button className="mission-add-btn" onClick={handleApplyGrid}>APLICAR GRID</button>
        </div>

        <div className="inventory-toolbar-row">
          <input
            className="entry-input"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Nome do item"
          />
          <input className="entry-input" value={newW} onChange={(event) => setNewW(event.target.value)} placeholder="Largura (W)" />
          <input className="entry-input" value={newH} onChange={(event) => setNewH(event.target.value)} placeholder="Altura (H)" />
          <input className="entry-input" value={newColor} onChange={(event) => setNewColor(event.target.value)} placeholder="#Cor" />
          <button className="mission-add-btn" onClick={handleAddItem}>ADICIONAR ITEM</button>
        </div>

        <div className="inventory-toolbar-row">
          <button className="mission-action-btn edit" onClick={handleRotateSelected}>ROTACIONAR ITEM (R)</button>
          <button className="mission-action-btn delete" onClick={handleDeleteSelected}>EXCLUIR ITEM</button>
          <button className="mission-action-btn delete" onClick={handleClearInventory}>LIMPAR INVENTARIO</button>
          <div className="inventory-cash">
            Dinheiro: E$ {cash}
          </div>
          <div className="inventory-status">
            {status || `Grid ${gridCols}x${gridRows} | Itens: ${items.length}`}
          </div>
        </div>
      </div>

      <div className="inventory-possessions">
        <div className="inventory-possessions-title">Posses</div>
        {possessions.length === 0 ? (
          <div className="inventory-possessions-empty">Nenhum item comprado ainda.</div>
        ) : (
          <div className="inventory-possessions-list">
            {possessions.map((entry) => (
              <div className="inventory-possession-item" key={entry.id}>
                <div className="inventory-possession-main">
                  <div className="inventory-possession-name">{entry.name}</div>
                  <div className="inventory-possession-meta">
                    Qtd: {entry.quantity} - {entry.category || '---'}
                  </div>
                  {entry.equipped ? (
                    <div className="inventory-possession-tags">
                      <span className="inventory-possession-tag">EQUIPADO</span>
                    </div>
                  ) : null}
                </div>
                <div className="inventory-possession-actions">
                  <div className="inventory-possession-meta">
                    {entry.grid ? `Grid: ${entry.grid.w}x${entry.grid.h}` : 'Grid: --'}
                  </div>
                  <button
                    className={`inventory-possession-equip ${entry.equipped ? 'is-equipped' : ''}`}
                    onClick={() => handleToggleEquipped(entry)}
                  >
                    {entry.equipped ? 'DESEQUIPAR' : 'EQUIPAR'}
                  </button>
                  <button className="inventory-possession-add" onClick={() => handleAddPossession(entry)}>
                    + ADICIONAR
                  </button>
                  <button className="inventory-possession-sell" onClick={() => handleSellPossession(entry)}>
                    VENDER
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="re4-layout">
        <div
          ref={inventoryRef}
          className="re4-grid"
          style={{
            width: `${gridCols * CELL_SIZE}px`,
            height: `${gridRows * CELL_SIZE}px`,
            backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
          }}
        >
          {gridPreview ? (
            <div
              className={`re4-grid-preview ${gridPreview.valid ? 'is-valid' : 'is-invalid'}`}
              style={{
                width: `${gridPreview.w * CELL_SIZE}px`,
                height: `${gridPreview.h * CELL_SIZE}px`,
                left: `${gridPreview.x * CELL_SIZE}px`,
                top: `${gridPreview.y * CELL_SIZE}px`,
              }}
            />
          ) : null}
          {items
            .filter((item) => item.location === 'grid')
            .map((item) =>
              renderItem({
                ...item,
                x: item.x * CELL_SIZE,
                y: item.y * CELL_SIZE,
              })
            )}
        </div>

        <div ref={poolRef} className="re4-pool">
          {items.filter((item) => item.location === 'pool').map((item) => renderItem(item))}
        </div>
      </div>

      {dragItem && dragDims ? (
        <div
          className="re4-item re4-drag-preview"
          style={{
            width: `${dragDims.w * CELL_SIZE}px`,
            height: `${dragDims.h * CELL_SIZE}px`,
            left: `${dragPreview.mouseX - dragPreview.offsetX}px`,
            top: `${dragPreview.mouseY - dragPreview.offsetY}px`,
            background: dragItem.imageUrl ? 'transparent' : dragItem.color,
          }}
        >
          {dragImage ? (
            <div className="re4-item-image-wrap" style={dragImageWrapStyle}>
              <img
                className="re4-item-image"
                src={dragImage}
                alt={dragItem.name}
              />
            </div>
          ) : null}
          <span className="re4-item-label">{dragItem.name}</span>
        </div>
      ) : null}

      {detailItem ? (
        <div className="inventory-detail-overlay" onClick={() => setDetailItem(null)}>
          <div className="inventory-detail-card" onClick={(event) => event.stopPropagation()}>
            <div className="inventory-detail-header">
              <div className="inventory-detail-title">{detailItem.name}</div>
              <button className="mission-action-btn delete" onClick={() => setDetailItem(null)}>FECHAR</button>
            </div>
            {detailItem.imageUrl ? (
              <img className="inventory-detail-image" src={detailItem.imageUrl} alt={detailItem.name} />
            ) : null}
            <div className="inventory-detail-meta">
              {findLabel(CATEGORY_FILTERS, detailItem.category)}{detailItem.source ? ` - ${findLabel(SOURCE_FILTERS, detailItem.source)}` : ''}
            </div>
            <div className="inventory-detail-meta">
              Preco: E$ {detailItem.priceEb} {detailItem.priceNote ? `(${detailItem.priceNote})` : ''}
            </div>
            {detailItem.grid ? (
              <div className="inventory-detail-meta">Grid: {detailItem.grid.w}x{detailItem.grid.h}</div>
            ) : null}
            {detailItem.description ? (
              <div className="inventory-detail-desc">{detailItem.description}</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
