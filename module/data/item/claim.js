export default class ClaimData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { BooleanField, HTMLField } = foundry.data.fields;

    return {
      description: new HTMLField(),
      controlled: new BooleanField({ initial: false })
    };
  }
}
