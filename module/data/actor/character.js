import { buildAttributeSchema, buildHarmSchema, buildKeySlots, buildDeadlockSlots } from '../../config.js';

export default class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { SchemaField, NumberField, StringField, ArrayField, HTMLField } = foundry.data.fields;

    return {
      schemaVersion: new NumberField({ initial: 4 }),
      alias: new StringField({ initial: '' }),
      look: new StringField({ initial: '' }),
      wearing: new StringField({ initial: '' }),
      background: new StringField({ initial: '' }),
      attributes: new SchemaField(buildAttributeSchema()),
      stress: new SchemaField({
        value: new NumberField({ initial: 0, min: 0, integer: true }),
        max: new NumberField({ initial: 9, min: 0, integer: true })
      }),
      trauma: new ArrayField(new StringField()),
      healing: new SchemaField({
        value: new NumberField({ initial: 0, min: 0, integer: true }),
        max: new NumberField({ initial: 4, min: 1, integer: true })
      }),
      harm: new SchemaField(buildHarmSchema()),
      keys: buildKeySlots(5),
      deadlocks: buildDeadlockSlots(5),
      load: new SchemaField({
        quietMax: new NumberField({ initial: 3, min: 0, integer: true }),
        loudMin: new NumberField({ initial: 6, min: 0, integer: true })
      }),
      coin: new SchemaField({
        value: new NumberField({ initial: 0, min: 0, integer: true }),
        max: new NumberField({ initial: 4, min: 0, integer: true })
      }),
      stash: new SchemaField({
        value: new NumberField({ initial: 0, min: 0, integer: true }),
        max: new NumberField({ initial: 40, min: 0, integer: true })
      }),
      specialResource: new SchemaField({
        name: new StringField({ initial: '' }),
        value: new NumberField({ initial: 0, min: 0, integer: true }),
        max: new NumberField({ initial: 0, min: 0, integer: true })
      }),
      xp: new SchemaField({
        playbook: new SchemaField({
          value: new NumberField({ initial: 0, min: 0, integer: true }),
          max: new NumberField({ initial: 8, min: 0, integer: true })
        }),
        insight: new SchemaField({
          value: new NumberField({ initial: 0, min: 0, integer: true }),
          max: new NumberField({ initial: 6, min: 0, integer: true })
        }),
        prowess: new SchemaField({
          value: new NumberField({ initial: 0, min: 0, integer: true }),
          max: new NumberField({ initial: 6, min: 0, integer: true })
        }),
        resolve: new SchemaField({
          value: new NumberField({ initial: 0, min: 0, integer: true }),
          max: new NumberField({ initial: 6, min: 0, integer: true })
        })
      }),
      notes: new HTMLField()
    };
  }
}
