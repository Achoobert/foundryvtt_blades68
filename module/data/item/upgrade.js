export default class UpgradeData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { NumberField, BooleanField, HTMLField } = foundry.data.fields;

    return {
      description: new HTMLField(),
      quality: new NumberField({ initial: 0, min: 0, integer: true }),
      purchased: new BooleanField({ initial: false })
    };
  }
}
