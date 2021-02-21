import ActorSheet5eCharacter from "../../../systems/dnd5e/module/actor/sheets/character.js"
import {Dying} from "./state.js"
import Log, {KEY, MAX_DYING} from "./dying-condition.js"
import {d20Roll} from "../../../systems/dnd5e/module/dice.js"

export default class DyingConditionCharacterSheet extends ActorSheet5eCharacter {
  constructor(...args) {
    super(...args)
  }

  get template() {
    if (!game.user.isGM && this.actor.limited) return "systems/dnd5e/templates/actors/limited-sheet.html"
    return `modules/${KEY}/templates/dying-condition.html`
  }

  /**
   * Handle mouse click events for character sheet actions
   * @param {MouseEvent} event    The originating click event
   * @private
   */
  _onSheetAction(event) {
    if (event.currentTarget.dataset.action === "deathSavingThrow") {
      return this.rollDeathSave()
    } else {
      return super._onSheetAction(event)
    }
  }

  get attributes() {
    return this.actor.data.data.attributes
  }
  /**
  * @returns {number}
  */
  get hp() {
    return this.attributes.hp.value
  }

  /**
  * @returns {String}
  */
  get state() {
    return this.attributes.state
  }

  /**
   * @returns {number}
   */
  get dying() {
    return this.attributes.dying
  }

  /**
   * @returns {number}
   */
  get exhaustion() {
    return this.attributes.exhaustion
  }

  /**
   * @returns {Promise<void>}
   */
  async increaseDying(amount = 1) {
    const dying = this.dying + amount
    if (this.state !== Dying) {
      Log.error(`Trying to increase dying but state is ${this.state}`)
      return Promise.resolve(void 0)
    } else if (dying > MAX_DYING) {
      await this.actor.kill()
    } else {
      await this.actor.setDying(dying)
    }
  }

  /**
   * @param amount
   * @returns {Promise<void>}
   */
  async decreaseDying(amount = 1) {
    const dying = this.dying - amount
    if (this.state !== Dying) {
      Log.error(`Trying to increase dying but state is ${this.state}`)
      return Promise.resolve(void 0)
    } else if (dying <= 0) {
      await this.actor.stabilize()
    } else {
      await this.actor.setDying(dying)
    }
  }

  /**
   * @returns {Promise<void>}
   */
  async rollDeathSave() {
    const actor = this.actor
    if (this.state !== Dying) {
      Log.error(`Trying to roll death saving throw but state is ${this.state}`)
      return Promise.resolve(void 0)
    }
    const speaker = ChatMessage.getSpeaker({actor: actor})
    const dc = 10 + this.dying
    return d20Roll({targetValue: dc, speaker: speaker, fastForward: true, title: "Death Saving Throw"}).then(roll => {
      const result = roll.results[0]
      if (result === 1) {
        return this.increaseDying(2)
      } else if (result === 20) {
        return this.decreaseDying(2)
      } else if (result < dc) {
        return this.increaseDying()
      } else {
        return this.decreaseDying()
      }
    })
  }
}