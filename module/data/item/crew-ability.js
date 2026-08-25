export default class CrewAbilityData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { NumberField, BooleanField, HTMLField } = foundry.data.fields;

    return {
      description: new HTMLField(),
      dcDescription: new HTMLField(),
      cost: new NumberField({ initial: 0, min: 0, integer: true }),
      unlocked: new BooleanField({ initial: false })
    };
  }
}
