import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type BoardNode = {
  id: string;
  type: 'shape' | 'text' | 'sticky';
  shapeType?: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  color: string;
  textColor: string;
  borderColor?: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  textAlign?: 'left';
};

type BoardArrow = {
  id: string;
  fromId: string;
  toId: string;
  label: string;
  routing: 'ortho';
  style: {
    stroke: string;
    width: number;
  };
};

export type GeneratedBoardBrainmap = {
  board_name: string;
  generated_at: string;
  source_brainmap: string;
  data: {
    nodes: BoardNode[];
    arrows: BoardArrow[];
    comments: [];
    votes: Record<string, never>;
  };
};

const SECTION_COLORS = ['#dbeafe', '#dcfce7', '#fef3c7', '#fce7f3', '#e0e7ff', '#cffafe'];
const ITEM_COLORS = ['#eff6ff', '#f0fdf4', '#fffbeb', '#fdf2f8', '#eef2ff', '#ecfeff'];

function normalizeText(value: string): string {
  return value
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function slug(value: string): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 72) || 'item';
}

function estimateHeight(text: string, width: number, minimum = 72): number {
  const approximateCharsPerLine = Math.max(20, Math.floor(width / 7));
  const lines = Math.max(1, Math.ceil(text.length / approximateCharsPerLine));
  return Math.max(minimum, Math.min(150, 38 + lines * 16));
}

export async function regenerateBoardBrainmap(projectRoot: string): Promise<GeneratedBoardBrainmap> {
  const sourcePath = path.join(projectRoot, 'ai', 'BRAINMAP.md');
  const snapshotPath = path.join(projectRoot, 'ai', 'BOARD_BRAINMAP.json');
  const markdown = await readFile(sourcePath, 'utf8');
  const lines = markdown.replace(/^\uFEFF/, '').split(/\r?\n/);
  const title = normalizeText(lines.find((line) => line.startsWith('# '))?.slice(2) || 'NiClaw Brainmap');
  const nodes: BoardNode[] = [];
  const arrows: BoardArrow[] = [];
  const usedIds = new Map<string, number>();
  const sectionOffsets = new Map<string, number>();
  const sectionColumns = new Map<string, number>();
  const columnHeights = [48, 48, 48];
  const lastItemByIndent = new Map<number, string>();
  let currentSectionId = 'node_root';
  let sectionIndex = 0;

  const uniqueId = (prefix: string, value: string) => {
    const base = `${prefix}_${slug(value)}`;
    const next = (usedIds.get(base) || 0) + 1;
    usedIds.set(base, next);
    return next === 1 ? base : `${base}_${next}`;
  };

  const addArrow = (fromId: string, toId: string, width = 2) => {
    arrows.push({
      id: `arrow_${fromId}_${toId}`,
      fromId,
      toId,
      label: '',
      routing: 'ortho',
      style: {
        stroke: width === 3 ? '#64748b' : '#94a3b8',
        width,
      },
    });
  };

  nodes.push({
    id: 'node_root',
    type: 'shape',
    shapeType: 'rect',
    x: 48,
    y: 48,
    w: 300,
    h: 76,
    text: title,
    color: '#0f172a',
    textColor: '#f8fafc',
    borderColor: '#020617',
    fontSize: 20,
    fontWeight: 'bold',
  });

  nodes.push({
    id: 'board_meta',
    type: 'sticky',
    x: 48,
    y: 148,
    w: 300,
    h: 92,
    text: `Generated from ai/BRAINMAP.md\nRoot: ${projectRoot}`,
    color: '#fef9c3',
    textColor: '#713f12',
    borderColor: '#f59e0b',
    fontSize: 11,
    fontWeight: 'normal',
  });

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      const previousSection = nodes.find((node) => node.id === currentSectionId);
      const previousColumn = sectionColumns.get(currentSectionId);
      if (previousSection && previousColumn !== undefined) {
        columnHeights[previousColumn] = previousSection.y + 84 + (sectionOffsets.get(currentSectionId) || 0) + 36;
      }
      const text = normalizeText(heading[1]);
      const id = uniqueId('section', text);
      const column = columnHeights.indexOf(Math.min(...columnHeights));
      const x = 430 + column * 640;
      const y = columnHeights[column];
      currentSectionId = id;
      sectionOffsets.set(id, 0);
      sectionColumns.set(id, column);
      lastItemByIndent.clear();
      nodes.push({
        id,
        type: 'shape',
        shapeType: 'rect',
        x,
        y,
        w: 540,
        h: 58,
        text,
        color: SECTION_COLORS[sectionIndex % SECTION_COLORS.length],
        textColor: '#0f172a',
        borderColor: '#94a3b8',
        fontSize: 17,
        fontWeight: 'bold',
      });
      addArrow('node_root', id, 3);
      sectionIndex += 1;
      continue;
    }

    const listItem = line.match(/^(\s*)[-*]\s+(.+)$/);
    const paragraph = !line.startsWith('#') && line.trim() ? line.trim() : '';
    if (!listItem && !paragraph) continue;

    const rawText = listItem ? listItem[2] : paragraph;
    const text = normalizeText(rawText);
    if (!text || currentSectionId === 'node_root') continue;
    const indent = listItem ? Math.floor(listItem[1].length / 2) : 0;
    const sectionNode = nodes.find((node) => node.id === currentSectionId);
    if (!sectionNode) continue;
    const offset = sectionOffsets.get(currentSectionId) || 0;
    const x = sectionNode.x + 24 + Math.min(indent, 2) * 24;
    const y = sectionNode.y + 84 + offset;
    const width = 492 - Math.min(indent, 2) * 24;
    const height = estimateHeight(text, width);
    const id = uniqueId('node', text);

    nodes.push({
      id,
      type: 'sticky',
      x,
      y,
      w: width,
      h: height,
      text,
      color: ITEM_COLORS[(sectionIndex - 1) % ITEM_COLORS.length],
      textColor: '#1e293b',
      borderColor: '#cbd5e1',
      fontSize: 12,
      fontWeight: 'normal',
    });

    const parentId = indent > 0 ? lastItemByIndent.get(indent - 1) || currentSectionId : currentSectionId;
    addArrow(parentId, id);
    sectionOffsets.set(currentSectionId, offset + height + 18);
    lastItemByIndent.set(indent, id);
    for (const key of [...lastItemByIndent.keys()]) {
      if (key > indent) lastItemByIndent.delete(key);
    }
  }

  const snapshot: GeneratedBoardBrainmap = {
    board_name: 'NiClaw Spatial AI OS Brainmap',
    generated_at: new Date().toISOString(),
    source_brainmap: sourcePath,
    data: {
      nodes,
      arrows,
      comments: [],
      votes: {},
    },
  };

  await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  return snapshot;
}
