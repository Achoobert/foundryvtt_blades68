import { BladesHelpers } from "./blades-helpers.js";
import { renderHandlebarsTemplate as renderTemplate } from "./compat.js";

/**
 * Extend the basic Item
 * @extends {Item}
 */
export class BladesItem extends Item {

  /** @override */
  async _preCreate( data, options, user ) {
    await super._preCreate( data, options, user );

    let removeItems = [];
    if( user.id === game.user.id ) {
      let actor = this.parent ? this.parent : null;
      if( actor?.documentName === "Actor" ) {
        removeItems = BladesHelpers.removeDuplicatedItemType( data, actor );
      }
      if( removeItems.length !== 0 ) {
        await actor.deleteEmbeddedDocuments( "Item", removeItems );
      }
    }
  }

  /* -------------------------------------------- */

  async sendToChat() {
    const itemData = this.toObject();
    if (itemData.img.includes("/mystery-man")) {
      itemData.img = null;
    }
    const html = await renderTemplate("systems/blades68/templates/chat/chat-item.html", itemData);
    const chatData = {
      user: game.userId,
      content: html,
    };
    const message = await ChatMessage.create(chatData);
  }
}
