export default class PlaybookData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { StringField, HTMLField } = foundry.data.fields;

    return {
      description: new HTMLField(),
      tagline: new StringField({ initial: '' }),
      startingLoad: new StringField({ initial: '' }),
      hueColor: new StringField({ initial: '' })
    };
  }
}
