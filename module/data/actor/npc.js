export default class NpcData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { SchemaField, NumberField, StringField, ArrayField, HTMLField } = foundry.data.fields;

    return {
      schemaVersion: new NumberField({ initial: 1 }),
      role: new StringField({ initial: '' }),
      faction: new StringField({ initial: '' }),
      actionRating: new NumberField({ initial: 0, min: 0, max: 4, integer: true }),
      harm: new ArrayField(new StringField()),
      tags: new ArrayField(new StringField()),
      notes: new HTMLField()
    };
  }
}
