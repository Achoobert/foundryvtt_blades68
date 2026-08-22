export const BLADES68 = {
  ID: 'blades68',

  ATTRIBUTES: ['insight', 'prowess', 'resolve'],

  ACTIONS: {
    insight: ['hunt', 'study', 'survey', 'hack'],
    prowess: ['finesse', 'prowl', 'skirmish', 'wreck'],
    resolve: ['attune', 'command', 'consort', 'sway']
  },

  HARM_TIERS: [
    { key: 'passing', slots: 2 },
    { key: 'major', slots: 2 },
    { key: 'needHelp', slots: 1 },
    { key: 'mortal', slots: 1 }
  ],

  RESULT_TIERS: {
    CRITICAL: 'critical',
    SUCCESS: 'success',
    PARTIAL: 'partial',
    FAILURE: 'failure'
  },

  ROLL_TYPES: {
    ACTION: 'action',
    RESISTANCE: 'resistance',
    FORTUNE: 'fortune'
  },

  POSITIONS: ['controlled', 'risky', 'desperate'],

  EFFECTS: ['limited', 'standard', 'great'],

  FACTION_CATEGORIES: ['underworld', 'institutions', 'corporate', 'fringe', 'citizenry'],

  HOLD: ['weak', 'strong'],

  LOAD_TIERS: ['quiet', 'normal', 'loud'],

  COHORT_TYPES: ['gang', 'expert']
};

export function buildAttributeSchema() {
  const { SchemaField, NumberField } = foundry.data.fields;
  const attributes = {};
  for (const attribute of BLADES68.ATTRIBUTES) {
    const actionFields = {};
    for (const action of BLADES68.ACTIONS[attribute]) {
      actionFields[action] = new NumberField({ initial: 0, min: 0, max: 4, integer: true });
    }
    attributes[attribute] = new SchemaField({
      actions: new SchemaField(actionFields)
    });
  }
  return attributes;
}

export function buildHarmSchema() {
  const { SchemaField, StringField } = foundry.data.fields;
  const harm = {};
  for (const tier of BLADES68.HARM_TIERS) {
    const slotFields = {};
    for (let i = 1; i <= tier.slots; i++) {
      slotFields[`slot${i}`] = new StringField({ initial: '' });
    }
    harm[tier.key] = new SchemaField(slotFields);
  }
  return harm;
}

export function buildKeySlots(count = 5) {
  const { ArrayField, SchemaField, StringField, NumberField, BooleanField } = foundry.data.fields;
  return new ArrayField(
    new SchemaField({
      label: new StringField({ initial: '' }),
      marks: new NumberField({ initial: 0, min: 0, max: 3, integer: true }),
      boom: new BooleanField({ initial: false })
    }),
    { initial: () => Array.from({ length: count }, () => ({ label: '', marks: 0, boom: false })) }
  );
}

export function buildDeadlockSlots(count = 5) {
  const { ArrayField, SchemaField, StringField, BooleanField } = foundry.data.fields;
  return new ArrayField(
    new SchemaField({
      label: new StringField({ initial: '' }),
      triggered: new BooleanField({ initial: false })
    }),
    { initial: () => Array.from({ length: count }, () => ({ label: '', triggered: false })) }
  );
}
