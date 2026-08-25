import assert from 'node:assert/strict';
import test from 'node:test';

import { buildRoll20Documents, stableId } from '../../scripts/roll20-content.mjs';

const translations = {
  heritage: 'Heritage',
  heritage_info: 'Akoros / The Dagger Isles / Iruvia',
  claim_abandoned_lab: 'Abandoned Lab',
  claim_abandoned_lab_description: '+1d to Attune on-site',
  playbook_ability_arcane_sight: 'Arcane Sight',
  playbook_ability_arcane_sight_description: 'See supernatural energies.',
  crew_ability_commitment: 'Commitment',
  crew_ability_commitment_description: 'Get +1d to resistance rolls.',
  crew_ability_commitment_dc_action_description: 'Get +1d when you push yourself.',
  crew_ability_commitment_dc_downtime_description: 'Get +1d during downtime.',
  crew_ability_separator: '-------',
  upgrade_documents_description: '+1 quality for Documents.',
  faction_ink_lane_tabloids: 'Ink Lane Tabloids',
  faction_ink_lane_tabloids_notes: 'Notorious tabloids with real investigations.',
  faction_mode: 'Faction Mode',
  a_blade_or_two: 'A Blade or Two',
  a_blade_or_two_description: 'Several useful knives.',
  advanced_visual_sensors: 'Advanced Visual Sensors',
  advanced_visual_sensors_description: 'Switch among several visual modes.',
  attune: 'Attune',
  attune_description: 'Attune to spirits.',
  playbook: 'Playbook',
  playbook_description: 'A short playbook description.'
};

test('stableId returns the same Foundry-safe id for the same type and name', () => {
  assert.equal(stableId('gear', 'A Blade or Two'), stableId('gear', 'A Blade or Two'));
  assert.match(stableId('gear', 'A Blade or Two'), /^[a-f0-9]{16}$/);
  assert.notEqual(stableId('gear', 'A Blade or Two'), stableId('ability', 'A Blade or Two'));
});

test('buildRoll20Documents maps approved translation families to Item documents', () => {
  const result = buildRoll20Documents(translations);

  assert.deepEqual(
    result.items.filter((item) => item.type === 'heritage').map((item) => item.name),
    ['Akoros', 'Iruvia', 'The Dagger Isles']
  );

  const claim = result.items.find((item) => item.type === 'claim');
  assert.equal(claim.name, 'Abandoned Lab');
  assert.equal(claim.system.description, '<p>+1d to Attune on-site</p>');
  assert.equal(claim.system.controlled, false);

  const ability = result.playbooks.find((item) => item.type === 'ability');
  assert.equal(ability.name, 'Arcane Sight');
  assert.equal(ability.system.playbook, '');

  const crewAbility = result.playbooks.find((item) => item.type === 'crew-ability');
  assert.equal(crewAbility.name, 'Commitment');
  assert.equal(crewAbility.system.description, '<p>Get +1d to resistance rolls.</p>');
  assert.equal(
    crewAbility.system.dcDescription,
    '<p><strong>Action:</strong> Get +1d when you push yourself.</p>' +
    '<p><strong>Downtime:</strong> Get +1d during downtime.</p>'
  );

  const upgrade = result.items.find((item) => item.type === 'upgrade');
  assert.equal(upgrade.name, 'Documents');
  assert.equal(upgrade.system.description, '<p>+1 quality for Documents.</p>');

  const faction = result.factions.find((item) => item.name === 'Ink Lane Tabloids');
  assert.equal(faction.system.notes, '<p>Notorious tabloids with real investigations.</p>');
  assert.equal(result.factions.some((item) => item.name === 'Faction Mode'), false);
});

test('gear includes described equipment and excludes action and UI descriptions', () => {
  const result = buildRoll20Documents(translations);
  const gearNames = result.items.filter((item) => item.type === 'gear').map((item) => item.name);

  assert.deepEqual(gearNames, ['A Blade or Two', 'Advanced Visual Sensors']);
  assert.equal(gearNames.includes('Attune'), false);
  assert.equal(gearNames.includes('Playbook'), false);
});

test('every generated document has a deterministic Item source shape', () => {
  const result = buildRoll20Documents(translations);
  const documents = [...result.playbooks, ...result.items, ...result.factions];

  for (const document of documents) {
    assert.equal(document._key, `!items!${document._id}`);
    assert.equal(document.ownership.default, 0);
    assert.deepEqual(document.effects, []);
    assert.equal(document.folder, null);
  }
});

test('generated names collapse layout whitespace and omit decorative separators', () => {
  const result = buildRoll20Documents({
    claim_above_law: 'Above\nthe Law',
    claim_above_law_description: 'Reduce wanted level.',
    crew_ability_separator: '-------'
  });

  assert.equal(result.items[0].name, 'Above the Law');
  assert.equal(result.playbooks.length, 0);
});
