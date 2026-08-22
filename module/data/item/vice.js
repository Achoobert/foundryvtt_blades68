export default class ViceData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { StringField, HTMLField } = foundry.data.fields;

    return {
      description: new HTMLField(),
      purveyor: new StringField({ initial: '' })
    };
  }
}
