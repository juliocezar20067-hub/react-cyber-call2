import { useEffect, useMemo, useRef, useState } from 'react';
import { playSound } from '../../sound/soundSystem';
import './Menu.css';

const CELL_SIZE = 46;
const MIN_GRID = 3;
const MAX_GRID = 16;
const INVENTORY_STORAGE_PREFIX = 'rc_inventory_grid_v1';

function storageKey(campaignId, playerId) {
  return `${INVENTORY_STORAGE_PREFIX}:${campaignId}:${playerId}`;
}

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

export default function InventoryPanel({ onBack, campaignId, playerId }) {
  const inventoryRef = useRef(null);
  const poolRef = useRef(null);

  const [colsInput, setColsInput] = useState('10');
  const [rowsInput, setRowsInput] = useState('6');
  const [gridCols, setGridCols] = useState(10);
  const [gridRows, setGridRows] = useState(6);
  const [items, setItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [status, setStatus] = useState('');

  const [newName, setNewName] = useState('');
  const [newW, setNewW] = useState('3');
  const [newH, setNewH] = useState('2');
  const [newColor, setNewColor] = useState('#4d80ff');

  const [dragPreview, setDragPreview] = useState(null);
  const dragPreviewRef = useRef(null);
  const [hydrated, setHydrated] = useState(false);

  const storage = useMemo(() => {
    if (!campaignId || !playerId) return null;
    return storageKey(campaignId, playerId);
  }, [campaignId, playerId]);

  useEffect(() => {
    dragPreviewRef.current = dragPreview;
  }, [dragPreview]);

  useEffect(() => {
    if (!storage) return;
    try {
      const raw = localStorage.getItem(storage);
      if (!raw) {
        setHydrated(true);
        return;
      }

      const parsed = JSON.parse(raw);
      const cols = Number(parsed?.gridCols);
      const rows = Number(parsed?.gridRows);
      const loadedItems = Array.isArray(parsed?.items) ? parsed.items : [];

      if (Number.isFinite(cols) && Number.isFinite(rows)) {
        setGridCols(clamp(Math.floor(cols), MIN_GRID, MAX_GRID));
        setGridRows(clamp(Math.floor(rows), MIN_GRID, MAX_GRID));
        setColsInput(String(clamp(Math.floor(cols), MIN_GRID, MAX_GRID)));
        setRowsInput(String(clamp(Math.floor(rows), MIN_GRID, MAX_GRID)));
      }

      setItems(
        loadedItems.map((item) => ({
          id: item.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name: item.name ?? 'Item',
          w: Math.max(1, Math.floor(item.w ?? 1)),
          h: Math.max(1, Math.floor(item.h ?? 1)),
          rotated: Boolean(item.rotated),
          color: item.color ?? '#4d80ff',
          location: item.location === 'grid' ? 'grid' : 'pool',
          x: Number.isFinite(item.x) ? item.x : 10,
          y: Number.isFinite(item.y) ? item.y : 10,
        }))
      );
      setHydrated(true);
    } catch {
      setHydrated(true);
    }
  }, [storage]);

  useEffect(() => {
    if (!storage || !hydrated) return;
    localStorage.setItem(
      storage,
      JSON.stringify({
        gridCols,
        gridRows,
        items,
      })
    );
  }, [gridCols, gridRows, hydrated, items, storage]);

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
        setDragPreview(null);
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

      setDragPreview(null);
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

  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;

  const handleBack = () => {
    playSound('button');
    onBack();
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

  const startDrag = (event, item) => {
    if (event.button !== 0) return;
    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();
    setSelectedItemId(item.id);
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

  const renderItem = (item) => {
    if (dragPreview?.itemId === item.id) return null;
    const dims = itemDims(item);
    const style = {
      width: `${dims.w * CELL_SIZE}px`,
      height: `${dims.h * CELL_SIZE}px`,
      left: `${item.x}px`,
      top: `${item.y}px`,
      background: item.color,
      zIndex: selectedItemId === item.id ? 3 : 1,
    };

    return (
      <div
        key={item.id}
        className={`re4-item ${selectedItemId === item.id ? 'is-selected' : ''}`}
        onMouseDown={(event) => startDrag(event, item)}
        onClick={() => handleSelectItem(item.id)}
        style={style}
      >
        <span className="re4-item-label">{item.name}</span>
      </div>
    );
  };

  const dragItem = dragPreview ? items.find((item) => item.id === dragPreview.itemId) : null;
  const dragDims = dragItem ? itemDims(dragItem, dragPreview.rotation) : null;

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
          <div className="inventory-status">
            {status || `Grid ${gridCols}x${gridRows} | Itens: ${items.length}`}
          </div>
        </div>
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
            background: dragItem.color,
          }}
        >
          <span className="re4-item-label">{dragItem.name}</span>
        </div>
      ) : null}
    </div>
  );
}
