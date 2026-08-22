export default class CrewPlaybookData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { HTMLField } = foundry.data.fields;

    return {
      description: new HTMLField()
    };
  }
}
