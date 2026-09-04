/**
 * Battle map: terrain canvas, grid overlay, pan/zoom, and paint tools.
 * Token rendering/dragging lives in tokens.js but shares the transform helpers
 * exported here.
 */
import { getState, dispatch } from './store.js';

const COLORS = {
  bg: '#232a38',
  bgAlt: '#262e3d',
  floor: '#48587a',
  wall: '#12151c',
  wallEdge: '#05070a',
};

let viewport, board, canvas, ctx, gridOverlay;
let scale = 1, tx = 0, ty = 0;
let painting = null;      // { kind } while a paint stroke is active
let lastCell = null;
let panning = null;       // { x, y, tx, ty }
let getTool = () => 'select';

export function initMap(toolGetter) {
  getTool = toolGetter;
  viewport = document.getElementById('viewport');
  board = document.getElementById('board');
  canvas = document.getElementById('terrain');
  ctx = canvas.getContext('2d');
  gridOverlay = document.getElementById('grid-overlay');

  viewport.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  viewport.addEventListener('wheel', onWheel, { passive: false });

  document.getElementById('reset-view').addEventListener('click', fitToView);

  requestAnimationFrame(fitToView);
}

export function applyTransform() {
  board.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
}

export function getScale() { return scale; }

/** client (px) -> board cell coords {x,y} (integers, may be out of range) */
export function screenToCell(clientX, clientY) {
  const rect = viewport.getBoundingClientRect();
  const bx = (clientX - rect.left - tx) / scale;
  const by = (clientY - rect.top - ty) / scale;
  const { cell } = getState().campaign.map;
  return { x: Math.floor(bx / cell), y: Math.floor(by / cell) };
}

export function cellToBoard(x, y) {
  const { cell } = getState().campaign.map;
  return { left: x * cell, top: y * cell, size: cell };
}

export function fitToView() {
  const { cols, rows, cell } = getState().campaign.map;
  const rect = viewport.getBoundingClientRect();
  const w = cols * cell, h = rows * cell;
  scale = Math.min(rect.width / w, rect.height / h) * 0.96;
  scale = Math.max(0.2, Math.min(scale, 1.5));
  tx = (rect.width - w * scale) / 2;
  ty = (rect.height - h * scale) / 2;
  applyTransform();
}

export function renderMap() {
  const { cols, rows, cell, tiles } = getState().campaign.map;
  const w = cols * cell, h = rows * cell;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w; canvas.height = h;
    board.style.width = `${w}px`;
    board.style.height = `${h}px`;
  }

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, w, h);

  // faint checkerboard so the empty surface reads as a battle map
  ctx.fillStyle = COLORS.bgAlt;
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      if ((gx + gy) % 2 === 0) ctx.fillRect(gx * cell, gy * cell, cell, cell);
    }
  }

  for (const [key, kind] of Object.entries(tiles)) {
    const [x, y] = key.split(',').map(Number);
    ctx.fillStyle = kind === 'wall' ? COLORS.wall : COLORS.floor;
    ctx.fillRect(x * cell, y * cell, cell, cell);
    if (kind === 'wall') {
      ctx.strokeStyle = COLORS.wallEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
    }
  }

  gridOverlay.style.width = `${w}px`;
  gridOverlay.style.height = `${h}px`;
  gridOverlay.style.backgroundSize = `${cell}px ${cell}px`;
}

export function setGridVisible(v) {
  gridOverlay.style.display = v ? 'block' : 'none';
}

// ---- interaction ----

function onPointerDown(e) {
  if (e.button === 1 || e.button === 2) return;
  const tool = getTool();
  const onToken = e.target.closest('.token');

  if (onToken && tool === 'select') return; // token drag handled elsewhere

  if (tool === 'floor' || tool === 'wall' || tool === 'erase') {
    painting = { kind: tool === 'erase' ? null : tool };
    lastCell = null;
    paintAt(e.clientX, e.clientY);
    viewport.setPointerCapture?.(e.pointerId);
    return;
  }

  // default: pan
  panning = { x: e.clientX, y: e.clientY, tx, ty };
  viewport.classList.add('grabbing');
}

function onPointerMove(e) {
  if (painting) {
    paintAt(e.clientX, e.clientY);
  } else if (panning) {
    tx = panning.tx + (e.clientX - panning.x);
    ty = panning.ty + (e.clientY - panning.y);
    applyTransform();
  }
}

function onPointerUp() {
  painting = null;
  panning = null;
  lastCell = null;
  viewport.classList.remove('grabbing');
}

function paintAt(clientX, clientY) {
  const { x, y } = screenToCell(clientX, clientY);
  const { cols, rows } = getState().campaign.map;
  if (x < 0 || y < 0 || x >= cols || y >= rows) return;
  const key = `${x},${y}`;
  if (lastCell === key) return;
  lastCell = key;
  dispatch({ type: 'map/paint', payload: { cells: [{ x, y, kind: painting.kind }] } });
}

function onWheel(e) {
  e.preventDefault();
  const rect = viewport.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
  const next = Math.max(0.2, Math.min(3, scale * factor));
  // zoom toward cursor
  tx = px - (px - tx) * (next / scale);
  ty = py - (py - ty) * (next / scale);
  scale = next;
  applyTransform();
}
