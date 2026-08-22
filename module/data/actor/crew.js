export default class CrewData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { SchemaField, NumberField, StringField, ArrayField, HTMLField } = foundry.data.fields;

    return {
      schemaVersion: new NumberField({ initial: 2 }),
      reputation: new StringField({ initial: '' }),
      tier: new NumberField({ initial: 0, min: 0, max: 4, integer: true }),
      hold: new StringField({ initial: 'weak' }),
      rep: new SchemaField({
        value: new NumberField({ initial: 0, min: 0, integer: true }),
        max: new NumberField({ initial: 12, min: 0, integer: true })
      }),
      heat: new SchemaField({
        value: new NumberField({ initial: 0, min: 0, integer: true }),
        max: new NumberField({ initial: 9, min: 0, integer: true })
      }),
      wanted: new SchemaField({
        value: new NumberField({ initial: 0, min: 0, integer: true }),
        max: new NumberField({ initial: 4, min: 0, integer: true })
      }),
      turf: new SchemaField({
        value: new NumberField({ initial: 0, min: 0, integer: true }),
        max: new NumberField({ initial: 6, min: 0, integer: true })
      }),
      stacks: new SchemaField({
        value: new NumberField({ initial: 0, min: 0, integer: true }),
        max: new NumberField({ initial: 10, min: 0, integer: true })
      }),
      vault: new SchemaField({
        value: new NumberField({ initial: 0, min: 0, integer: true }),
        max: new NumberField({ initial: 16, min: 0, integer: true })
      }),
      base: new HTMLField(),
      xpClocks: new ArrayField(
        new SchemaField({
          value: new NumberField({ initial: 0, min: 0, integer: true }),
          max: new NumberField({ initial: 6, min: 1, integer: true })
        }),
        { initial: () => Array.from({ length: 4 }, () => ({ value: 0, max: 6 })) }
      ),
      huntingGrounds: new SchemaField({
        type: new StringField({ initial: '' }),
        description: new HTMLField()
      }),
      notes: new HTMLField()
    };
  }
}
