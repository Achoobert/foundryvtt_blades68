import { getRangeItems, readingOrder, findBodyFont, mergeConsecutiveSameFont } from './text-extract.js';

const CATEGORY_LABELS = {
  Underworld: 'underworld',
  Institutions: 'institutions',
  'Corporate & Community': 'corporate',
  Fringe: 'fringe',
  Citizenry: 'citizenry'
};

const ROMAN_VALUES = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

function romanToInt(roman) {
  let total = 0;
  for (let i = 0; i < roman.length; i++) {
    const value = ROMAN_VALUES[roman[i].toUpperCase()] ?? 0;
    const next = ROMAN_VALUES[roman[i + 1]?.toUpperCase()] ?? 0;
    total += value < next ? -value : value;
  }
  return total;
}

function isNoise(str) {
  const trimmed = str.trim();
  return !trimmed || /^\d+$/.test(trimmed) || trimmed === 'Faction Rolodex' || trimmed === 'Faction Details';
}

/**
 * Parses the short "Faction Rolodex" entries: a category heading followed by
 * repeated "Name (Tier): description" blocks, two columns per page.
 */
export async function parseFactionRolodex(pdfDoc, startPage, endPage) {
  const pages = await getRangeItems(pdfDoc, startPage, endPage);
  const rawItems = pages.flatMap((page) => readingOrder(page.items, page.width));
  const allItems = mergeConsecutiveSameFont(rawItems);
  const bodyFont = findBodyFont(allItems.filter((item) => !isNoise(item.str)));

  const factions = [];
  let currentCategory = 'underworld';
  let current = null;

  for (const item of allItems) {
    const text = item.str.trim();
    if (isNoise(item.str)) continue;

    if (CATEGORY_LABELS[text]) {
      currentCategory = CATEGORY_LABELS[text];
      continue;
    }

    const isNameFont = item.font !== bodyFont;
    if (isNameFont) {
      if (current) factions.push(current);
      current = { name: text, category: currentCategory, tier: 0, hold: 'weak', description: '' };
    } else if (current) {
      current.description += (current.description ? ' ' : '') + item.str;
    }
  }
  if (current) factions.push(current);

  for (const faction of factions) {
    const match = faction.description.match(/^\(([IVXLCDM]+)\)\s*:?\s*(.*)$/i);
    if (match) {
      faction.tier = romanToInt(match[1]);
      faction.description = match[2].trim();
    }
    faction.description = `<p>${faction.description}</p>`;
  }

  return factions;
}

const DOSSIER_FIELD_KEYS = {
  Turf: 'turf',
  NPCs: 'npcs',
  'Notable Assets': 'notableAssets',
  Assets: 'notableAssets',
  Quirks: 'quirks',
  Allies: 'allies',
  Enemies: 'enemies',
  Situation: 'situation'
};

// A two-word label like "Notable Assets" can arrive as two wrapped lines
// with no space character between them ("NotableAssets") once merged, so
// label lookups compare with whitespace stripped entirely, not just
// normalized. Some dossiers also shorten the label to just "Assets" —
// both spellings map to the same field above.
function stripSpaces(str) {
  return str.replace(/\s+/g, '');
}

const NORMALIZED_FIELD_KEYS = new Map(
  Object.entries(DOSSIER_FIELD_KEYS).map(([label, key]) => [stripSpaces(label).toLowerCase(), key])
);
const NORMALIZED_PRESTIGE_LABEL = stripSpaces('Prestige Ability').toLowerCase();

/**
 * Parses the full-page "Faction Details" dossiers: name, "Tier N (S/W)",
 * an intro blurb, long-term project clocks, and a set of labeled fields.
 */
function findLabelFont(items, knownLabels) {
  for (const item of items) {
    if (knownLabels.has(item.str.trim())) return item.font;
  }
  return null;
}

/**
 * Groups items into alternating runs of label-font and non-label-font text,
 * concatenating each run into one string. This is what lets a label that
 * wraps across two lines (e.g. "Notable" / "Assets") still be recognized as
 * a single "Notable Assets" unit — matching happens on the whole run, not a
 * single line fragment.
 */
const TIER_LINE_PATTERN = /^Tier\s+[IVXLCDM]+/i;

function groupIntoRuns(items) {
  const runs = [];
  for (const item of items) {
    // A tier line ("Tier II (S)") shares its font with the faction name line
    // right before it, with nothing else between them — always split it into
    // its own run so it never merges with the name (or anything after it).
    const isTierLine = item.isLabel && TIER_LINE_PATTERN.test(item.str.trim());
    const last = runs[runs.length - 1];
    if (!isTierLine && last && last.isLabel === item.isLabel && !last.isTierLine) {
      last.text += ` ${item.str}`;
    } else {
      runs.push({ isLabel: item.isLabel, isTierLine, text: item.str });
    }
  }
  return runs.map((run) => ({ ...run, text: run.text.replace(/\s+/g, ' ').trim() }));
}

// PDF.js re-numbers each page's embedded font subset independently, so a
// font ID like "g_d0_f6" can mean "body text" on one page and something else
// entirely on the next. Body/label font roles are therefore resolved once
// per page (scoped to that page's own items) and baked into an `isLabel`
// flag before pages are flattened into one continuous item stream — a
// single global font-ID comparison across the whole (multi-page) range
// silently misclassifies content once more than a couple of pages are
// involved.
// A handful of dossier pages carry a stray orphan/kicker line above the real
// name — same label font, but sitting well above the ~580pt band every
// observed genuine name (wrapped or not) starts in. Source-PDF layout
// artifact, not content; dropped like the "Faction Rolodex" running header.
const KICKER_Y_THRESHOLD = 595;

function tagPageItems(pageItems, knownLabels) {
  const merged = mergeConsecutiveSameFont(pageItems)
    .filter((item) => !isNoise(item.str))
    .filter((item) => item.y <= KICKER_Y_THRESHOLD);
  const labelFont = findLabelFont(merged, knownLabels);
  return merged.map((item) => ({ ...item, isLabel: labelFont !== null && item.font === labelFont }));
}

export async function parseFactionDetails(pdfDoc, startPage, endPage) {
  const pages = await getRangeItems(pdfDoc, startPage, endPage);
  const knownLabels = new Set(Object.keys(DOSSIER_FIELD_KEYS));
  const allItems = pages.flatMap((page) => tagPageItems(page.items, knownLabels));
  const runs = groupIntoRuns(allItems);

  const factions = [];
  let current = null;
  let activeField = null;

  const finalizeCurrent = () => {
    if (!current) return;
    current.description = `<p>${current.description.trim()}</p>`;
    for (const key of Object.values(DOSSIER_FIELD_KEYS)) {
      current[key] = `<p>${(current[key] ?? '').trim()}</p>`;
    }
    current.prestigeAbility.description = `<p>${current.prestigeAbility.description.trim()}</p>`;
    delete current.sawLabel;
    delete current.rawProjectText;
    factions.push(current);
  };

  const startFaction = (name) => {
    finalizeCurrent();
    current = {
      name,
      tier: 0,
      hold: 'weak',
      description: '',
      turf: '',
      npcs: '',
      notableAssets: '',
      quirks: '',
      allies: '',
      enemies: '',
      situation: '',
      prestigeAbility: { name: '', description: '' },
      sawLabel: false,
      rawProjectText: ''
    };
    activeField = null;
  };

  const cleanRuns = runs.filter((run) => run.text && !isNoise(run.text));

  // Some dossier pages carry a stray orphan/kicker line at the very top —
  // visually identical (same label font) to a faction name, but it's not
  // followed by a tier line the way a genuine name always is. A real name
  // is followed by "Tier N (S/W)"; a kicker is followed by ANOTHER
  // unrecognized label run (the actual name for that page). Detected via a
  // one-run lookahead rather than position, since the vertical offset of a
  // page's content varies too much to use a fixed y-threshold.
  const isTierRun = (run) => TIER_LINE_PATTERN.test(run.text.trim());
  const isRecognizedFieldOrPrestige = (run) => {
    const normalized = stripSpaces(run.text).toLowerCase();
    return NORMALIZED_FIELD_KEYS.has(normalized) || normalized.startsWith(NORMALIZED_PRESTIGE_LABEL);
  };
  const isUnrecognizedLabelRun = (run) => run.isLabel && !isRecognizedFieldOrPrestige(run) && !isTierRun(run);

  for (let i = 0; i < cleanRuns.length; i++) {
    const run = cleanRuns[i];

    if (run.isLabel) {
      const normalized = stripSpaces(run.text).toLowerCase();
      if (NORMALIZED_FIELD_KEYS.has(normalized)) {
        activeField = NORMALIZED_FIELD_KEYS.get(normalized);
        if (current) current.sawLabel = true;
        continue;
      }
      if (normalized.startsWith(NORMALIZED_PRESTIGE_LABEL)) {
        activeField = '__prestige__';
        if (current) current.sawLabel = true;
        continue;
      }

      if (isTierRun(run)) {
        const tierMatch = run.text.match(/^Tier\s+([IVXLCDM]+)\s*\(?([SW])?\)?$/i);
        if (current && tierMatch) {
          current.tier = romanToInt(tierMatch[1]);
          current.hold = tierMatch[2]?.toUpperCase() === 'S' ? 'strong' : 'weak';
        }
        activeField = null;
        continue;
      }

      // Label-font text that isn't a recognized label or tier line. Before
      // the first label is seen this is long-term-project title/clock-size
      // text; only treat it as a new faction once we're past that point.
      if (!current || current.sawLabel) {
        const next = cleanRuns[i + 1];
        if (next && isUnrecognizedLabelRun(next)) continue; // stray kicker line, discard
        startFaction(run.text);
      } else {
        current.rawProjectText += (current.rawProjectText ? ' ' : '') + run.text;
        activeField = null;
      }
      continue;
    }

    if (!current) continue;

    if (activeField === '__prestige__') {
      const separatorIndex = run.text.indexOf(':');
      if (separatorIndex > -1) {
        current.prestigeAbility.name = run.text.slice(0, separatorIndex).trim();
        current.prestigeAbility.description += run.text.slice(separatorIndex + 1);
      } else {
        current.prestigeAbility.description += run.text;
      }
    } else if (activeField && Object.values(DOSSIER_FIELD_KEYS).includes(activeField)) {
      current[activeField] += (current[activeField] ? ' ' : '') + run.text;
    } else {
      current.description += (current.description ? ' ' : '') + run.text;
    }
  }
  finalizeCurrent();

  return factions;
}

export function mergeFactionData(rolodexEntries, dossierEntries) {
  const dossierByName = new Map(dossierEntries.map((entry) => [entry.name, entry]));
  const merged = [];

  for (const entry of rolodexEntries) {
    const dossier = dossierByName.get(entry.name);
    if (dossier) {
      merged.push({ ...entry, ...dossier });
      dossierByName.delete(entry.name);
    } else {
      merged.push(entry);
    }
  }

  for (const leftover of dossierByName.values()) {
    merged.push({ category: 'underworld', ...leftover });
  }

  return merged;
}
