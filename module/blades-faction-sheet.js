import { BladesSheetV2 } from "./blades-sheet-v2.js";


export class BladesFactionSheet extends BladesSheetV2 {

  static DEFAULT_OPTIONS = {
    
    
    classes: [...super.DEFAULT_OPTIONS.classes, "blades68", "faction"],
    position: { width: 900, height: "auto" },
    actions: {
      "bid.updateBox": BladesFactionSheet._onUpdateBox
    }
  };

  static PARTS = {
    body: { template: "systems/blades68/templates/faction-sheet.html", scrollable: [""] }
  };

  
  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    return {
      ...ctx,
      actor: this.actor,
      document: this.document,
      _id: this.actor.id,
      id: this.actor.id,
      name: this.actor.name,
      img: this.actor.img,
      system: this.actor.system,
      
      
      items: this.actor.items.map(i => i.toObject()),
      owner: this.actor.isOwner,
      editable: this.isEditable,
      cssClass: this.isEditable ? "editable" : "locked",
      isGM: game.user.isGM
    };
  }

  
  static async _onUpdateBox(event, target) {
    event.preventDefault();
    const itemId = target.dataset.item;
    const updateType = target.dataset.utype;
    const updateValue = target.dataset.value;
    if (!itemId || (updateType !== "status" && updateType !== "hold")) {
      console.log("bid.updateBox: missing item id or unrecognized utype", target.dataset);
      return;
    }
    const update = { _id: itemId, system: { [updateType]: { value: updateValue } } };
    await this.actor.updateEmbeddedDocuments("Item", [update]);
  }
}
