function stem(filename) {
  return String(filename ?? '')
    .replace(/^.*[/\\]/, '')
    .replace(/\.pdf$/i, '');
}

function slug(name) {
  return name
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase() || 'carddeck';
}

/**
 * Infers Foundry Cards deck name + upload subdir from a PDF filename
 * (e.g. b68_troubledeck_v1.pdf → Trouble Deck / troubledeck).
 */
export function classifyCardDeck(filename) {
  const base = stem(filename);
  const lower = base.toLowerCase();
  if (lower.includes('trouble')) return { deckName: 'Trouble Deck', subdir: 'troubledeck' };
  if (lower.includes('faction')) return { deckName: 'Faction Deck', subdir: 'factiondeck' };
  const pretty = base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Card Deck';
  return { deckName: pretty, subdir: slug(pretty) };
}

/**
 * Character vs crew playbook sheets from filename.
 */
export function classifyPlaybookPdf(filename) {
  const lower = stem(filename).toLowerCase();
  if (lower.includes('crew')) {
    return { kind: 'crew', playbookType: 'crew-playbook', abilityType: 'crew-ability' };
  }
  return { kind: 'character', playbookType: 'playbook', abilityType: 'ability' };
}
