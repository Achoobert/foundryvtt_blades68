import { getPageItems, findBodyFont } from './text-extract.js';

function toTitleCase(str) {
  return str.replace(/\w\S*/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase());
}

// The fillable playbook/crew sheets share one template shape: a "special
// abilities" column starts with a header (e.g. "SPECIAL ABILITIES", "HULL
// TRAITS") and ends at the next item back at that same left edge (e.g. "SHADY
// FRIENDS", "CONTACTS", "FRAME FEATURES") — but that left edge (markerX) and
// the number of ability sub-columns (1 for playbooks, 2 side-by-side for crew
// sheets) both vary by sheet. Font IDs are re-numbered per page/PDF, so
// "which font is the label font" is recomputed per column rather than
// assumed to match some known label string; an item starts a new ability
// when its font differs from the column's (majority) body font and its text
// ends with ":".
// The abilities column's right edge also varies: on character sheets the gear
// ("ITEMS") column sits immediately to its right and must be excluded, while
// crew sheets have no gear column and their abilities run to the page edge.
const MARKER_TOLERANCE = 6;

function extractTitle(items) {
  const sorted = [...items].sort((a, b) => (b.h ?? 0) - (a.h ?? 0));
  return sorted[0]?.str.trim() ?? '';
}

export function findGearHeader(items) {
  return items.find((item) => /^ITEMS$/i.test(item.str.trim()));
}

export function extractGear(items) {
  const header = findGearHeader(items);
  if (!header) return [];

  const rows = [];
  for (const item of items
    .filter((entry) => entry.x > header.x && entry.y < header.y - 5)
    .sort((a, b) => b.y - a.y || a.x - b.x)) {
    const row = rows.find((candidate) => Math.abs(candidate.y - item.y) < 2);
    if (row) row.items.push(item);
    else rows.push({ y: item.y, items: [item] });
  }

  return rows.flatMap((row) => {
    const tokens = row.items.sort((a, b) => a.x - b.x).map((item) => item.str.trim());
    const quantity = tokens.find((token) => /^x\d+$/i.test(token));
    const name = tokens.filter((token) => !/^x\d+$/i.test(token)).join(' ').trim();
    if (!name) return [];
    return [{ name, load: quantity ? Number(quantity.slice(1)) : 1 }];
  });
}

function isNearX(item, x) {
  return Math.abs(item.x - x) <= MARKER_TOLERANCE;
}

function runAbilityStateMachine(items, bodyFont) {
  const abilities = [];
  let current = null;
  for (const item of items) {
    const isStart = item.font !== bodyFont && /:$/.test(item.str.trim());
    if (isStart) {
      if (current) abilities.push(current);
      current = { name: toTitleCase(item.str.trim().replace(/:$/, '')), description: '' };
    } else if (current) {
      current.description += (current.description ? ' ' : '') + item.str;
    }
  }
  if (current) abilities.push(current);
  return abilities;
}

function extractAbilities(items, header, maxX) {
  const below = items
    .filter((item) => item.y < header.y && item.x >= header.x - MARKER_TOLERANCE && item.x <= maxX)
    .sort((a, b) => b.y - a.y || a.x - b.x);

  const terminatorIndex = below.findIndex((item) => isNearX(item, header.x));
  const scoped = terminatorIndex === -1 ? below : below.slice(0, terminatorIndex);
  const bodyFont = findBodyFont(scoped);

  // Detect a two-column layout: multiple ability-start items sharing (nearly)
  // the same y as the topmost one, at clearly different x, means the column
  // is split side-by-side rather than stacked in one vertical run.
  const starts = scoped.filter((item) => item.font !== bodyFont && /:$/.test(item.str.trim()));
  const topY = starts[0]?.y;
  const topRowStarts = starts.filter((item) => Math.abs(item.y - topY) < 3);
  const columnXs = [...new Set(topRowStarts.map((item) => item.x))].sort((a, b) => a - b);

  let abilities;
  if (columnXs.length > 1) {
    // An item belongs to the rightmost column whose left edge it starts at or
    // after: a mid-sentence bold run sits well right of its own column's edge
    // but still left of the next column's, so a midpoint split would steal it.
    const columnOf = (item) => {
      const index = columnXs.findIndex((x) => item.x + MARKER_TOLERANCE < x);
      return index === -1 ? columnXs.length - 1 : Math.max(0, index - 1);
    };
    const columns = columnXs.map((_, i) => scoped.filter((item) => columnOf(item) === i));
    abilities = columns.flatMap((col) => runAbilityStateMachine(col, bodyFont));
  } else {
    abilities = runAbilityStateMachine(scoped, bodyFont);
  }

  for (const ability of abilities) {
    ability.description = `<p>${ability.description.trim()}</p>`;
  }
  return abilities;
}

/**
 * Parses one fillable playbook/crew-sheet page: a large title, an optional
 * subtitle beneath it, and a labeled column of special abilities.
 */
function findHeader(items) {
  return items.find(
    (item) => item.y >= 495 && item.y <= 535 && /abilit|traits/i.test(item.str.trim())
  );
}

async function parseSheetPage(pdfDoc, pageNumber) {
  const { width, items } = await getPageItems(pdfDoc, pageNumber);
  const header = findHeader(items);
  if (!header) return null;

  const title = extractTitle(items);
  if (!title) return null;

  const subtitleFont = items.find((item) => item.str.trim() === title)?.font;
  const subtitle = items.find(
    (item) => item.y < 545 && item.y > 530 && item.font === subtitleFont && item.str.trim() !== title
  )?.str.trim();

  const gearHeader = findGearHeader(items);
  const abilities = extractAbilities(items, header, gearHeader ? gearHeader.x - MARKER_TOLERANCE : width);
  const gear = extractGear(items);
  return { name: title, subtitle, abilities, gear };
}

function dedupeNames(entries) {
  const seen = new Map();
  for (const entry of entries) {
    const key = entry.name.toLowerCase();
    if (seen.has(key)) {
      const suffix = entry.subtitle ? ` (${toTitleCase(entry.subtitle)})` : ` (${seen.get(key) + 1})`;
      seen.set(key, seen.get(key) + 1);
      entry.name = `${entry.name}${suffix}`;
    } else {
      seen.set(key, 1);
    }
  }
  return entries;
}

/**
 * Parses every page of a fillable playbook-sheet PDF (one playbook per page,
 * except multi-page playbooks which repeat the same base title) into
 * {name, description, abilities, gear} entries.
 */
export async function parsePlaybookSheets(pdfDoc) {
  const entries = [];
  for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber++) {
    const parsed = await parseSheetPage(pdfDoc, pageNumber);
    if (parsed && parsed.abilities.length) {
      entries.push({
        name: parsed.name,
        description: '',
        abilities: parsed.abilities,
        gear: parsed.gear
      });
    }
  }
  return dedupeNames(entries);
}
