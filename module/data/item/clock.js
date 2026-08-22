export default class ClockData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { NumberField, StringField, BooleanField } = foundry.data.fields;

    return {
      value: new NumberField({ initial: 0, min: 0, integer: true }),
      max: new NumberField({ initial: 4, min: 1, integer: true }),
      color: new StringField({ initial: '#c0392b' }),
      shared: new BooleanField({ initial: false })
    };
  }
}
