export default class FactionData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { NumberField, StringField, BooleanField, HTMLField, SchemaField } = foundry.data.fields;

    return {
      schemaVersion: new NumberField({ initial: 3 }),
      category: new StringField({ initial: 'underworld' }),
      tier: new NumberField({ initial: 1, min: 0, max: 6, integer: true }),
      hold: new StringField({ initial: 'weak' }),
      status: new NumberField({ initial: 0, min: -3, max: 3, integer: true }),
      war: new BooleanField({ initial: false }),
      description: new HTMLField(),
      turf: new HTMLField(),
      npcs: new HTMLField(),
      notableAssets: new HTMLField(),
      quirks: new HTMLField(),
      allies: new HTMLField(),
      enemies: new HTMLField(),
      situation: new HTMLField(),
      prestigeAbility: new SchemaField({
        name: new StringField({ initial: '' }),
        description: new HTMLField()
      }),
      notes: new HTMLField()
    };
  }
}
