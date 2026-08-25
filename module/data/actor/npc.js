export default class NpcData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { NumberField, StringField, ArrayField, HTMLField, DocumentUUIDField } =
      foundry.data.fields;

    return {
      schemaVersion: new NumberField({ initial: 3 }),
      shortDescription: new StringField({ initial: '' }),
      description: new HTMLField(),
      playbook: new StringField({ initial: '' }),
      factionUuid: new DocumentUUIDField({ type: 'Item', blank: true, initial: '' }),
      actionRating: new NumberField({ initial: 0, min: 0, max: 4, integer: true }),
      harm: new ArrayField(new StringField()),
      tags: new ArrayField(new StringField()),
      notes: new HTMLField()
    };
  }

  /** Schema 3 replaced the single-line `role` field with short/long descriptions. */
  static migrateData(source, options, _state) {
    if (source.role && !source.shortDescription) source.shortDescription = source.role;
    return super.migrateData(source, options, _state);
  }
}
