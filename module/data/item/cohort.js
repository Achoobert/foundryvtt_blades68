export default class CohortData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { StringField, NumberField, ArrayField, HTMLField } = foundry.data.fields;

    return {
      description: new HTMLField(),
      type: new StringField({ initial: 'gang' }),
      quality: new NumberField({ initial: 0, min: 0, max: 6, integer: true }),
      harm: new NumberField({ initial: 0, min: 0, max: 3, integer: true }),
      armor: new NumberField({ initial: 0, min: 0, integer: true }),
      edges: new ArrayField(new StringField()),
      flaws: new ArrayField(new StringField())
    };
  }
}
