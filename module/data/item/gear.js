export default class GearData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { NumberField, BooleanField, HTMLField } = foundry.data.fields;

    return {
      description: new HTMLField(),
      load: new NumberField({ initial: 1, min: 0, integer: true }),
      carried: new BooleanField({ initial: false })
    };
  }
}
