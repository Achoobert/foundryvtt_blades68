export default class ContactData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { StringField, HTMLField } = foundry.data.fields;

    return {
      description: new HTMLField(),
      relationship: new StringField({ initial: 'friend' }),
      faction: new StringField({ initial: '' })
    };
  }
}
