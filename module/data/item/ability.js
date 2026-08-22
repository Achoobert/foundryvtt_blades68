export default class AbilityData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { StringField, BooleanField, HTMLField } = foundry.data.fields;

    return {
      description: new HTMLField(),
      playbook: new StringField({ initial: '' }),
      unlocked: new BooleanField({ initial: false })
    };
  }
}
