import {NONE, settings} from "./settings.js"
import {Log} from "./module.js"
import {d20Roll} from "../../../systems/dnd5e/module/dice.js"

const MAX_DYING = 5

class ImprovedToken {
  token

  constructor(token) {
    this.token = token
    const attributes = token.actor.data.data.attributes
    if (!attributes?.dying) {
      attributes.dying = 0
    }
  }

  async update(sheet) {
    const sheetHTML = sheet.element[0]
    const deathSaves = sheetHTML.querySelector(".death-saves")
    const text = deathSaves.querySelector("h4")
    delete text.dataset.action
    const counter = deathSaves.querySelector(".counter-value")
    counter.querySelectorAll("i").forEach(e => e.remove())
    counter.querySelector("input:last-child").remove()

    const dying = this.dying
    if (this.hp > 0) {
      await this._setAlive(text, counter)
    } else if (dying > MAX_DYING || (dying === 0 && this.exhaustion === 5)) {
      await this._setDead(text, counter)
    } else {
      await this._setDying(text, counter)
    }
  }

  async _setDying(text, counter) {
    let dying = this.dying
    if (dying === 0) {
      dying = this.exhaustion + 1
      await this.setDying(dying)
    }

    text.textContent = "Dying"

    const icon = document.createElement("i")
    icon.classList.add("fas", "fa-skull-crossbones")
    counter.insertBefore(icon, counter.querySelector("input"))

    counter.querySelector("input").name = "data.attributes.dying"
    counter.querySelector("input").value = dying.toString()

    text.addEventListener("click", () => this.rollDeathSave())
  }

  async _setDead(text, counter) {
    await this.setDead()
    text.textContent = "Dead"
    text.classList.remove("rollable")
    counter.querySelector("input").remove()
  }

  async _setAlive(text, counter) {
    await this.setAlive()
    text.textContent = "Alive"
    text.classList.remove("rollable")
    counter.querySelector("input").remove()
  }

  /**
   *
   * @param attribute {string}
   * @param value {number}
   * @returns {Promise<number>}
   */
  async modifyAttribute(attribute, value) {
    return this.token.actor.modifyTokenAttribute(`attributes.${attribute}`, value, false, false).then(_ => value)
  }

  get attributes() {
    return this.token.actor.data.data.attributes
  }
  /**
   * @returns {number}
   */
  get hp() {
    return this.attributes.hp.value
  }
  /**
   *
   * @param value {number}
   * @returns {Promise<number>}
   */
  async setHP(value) {
    return this.modifyAttribute("hp", value)
  }

  /**
   * @returns {number}
   */
  get dying() {
    return this.attributes.dying
  }
  /**
   *
   * @param value {number}
   * @returns {Promise<number>}
   */
  async setDying(value) {
    return this._setCUBDying(value).then (_ => this.modifyAttribute("dying", value))
  }

  /**
   * @returns {number}
   */
  get exhaustion() {
    return this.attributes.exhaustion
  }
  /**
   *
   * @param value {number}
   * @returns {Promise<number>}
   */
  async setExhaustion(value) {
    return this._setCUBExhaustion(value).then (_ => this.modifyAttribute("exhaustion", value))
  }

  /**
   * @returns {Promise<number>}
   */
  async setDead() {
    return this._setCUBDead()
      .then(_ => this._setCUBUnconscious())
      .then(_ => this._setCUBIncapacitated())
      .then(_ => this._setCUBProne())
      .then(_ => this.setDying(MAX_DYING + 1))
  }

  async setAlive() {
    return this._removeCUBDead()
      .then(_ => this._removeCUBUnconscious())
      .then(_ => this._removeCUBIncapacitated())
      .then(_ => this._removeCUBDying())
      .then(_ => this.setDying(0))
  }

  async increaseDying(amount = 1) {
    const dying = this.dying
    if (dying === 0) {
      Log.debug("Trying to increase dying but dying is 0")
      return 0
    } if (dying + amount > MAX_DYING) {
      return this.setDead()
    } else {
      return this.setDying(dying + amount)
    }
  }

  async decreaseDying(amount = 1) {
    const dying = this.dying
    if (dying === 0) {
      Log.debug("Trying to decrease dying but dying is 0")
      return 0
    } else if (dying - amount < 1) {
      const exhaust = this.exhaustion
      //Actor is no longer dying
      return this.setHP(1)
        .then(_ => this.setExhaustion(exhaust + 1))
        .then(_ => this.setAlive())
    } else {
      return this.setDying(dying - amount)
    }
  }

  async rollDeathSave() {
    const actor = this.token.actor
    if (this.hp !== 0) {
      Log.debug("Trying to roll death save but hp is not 0")
      return 0
    }
    const speaker = ChatMessage.getSpeaker({actor: actor})
    const dc = 10 + this.dying;
    d20Roll({targetValue: dc, speaker: speaker, fastForward: true, title: "Death Saving Throw"}).then(roll => {
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

  _getCUBConditions() {
    const conditionsObject = game?.cub?.getConditions(this.token, {warn: false})
    if (conditionsObject === null || typeof conditionsObject.conditions === 'undefined') {
      return []
    } else if (Array.isArray(conditionsObject.conditions)) {
      return conditionsObject.conditions
    } else {
      return [conditionsObject.conditions]
    }
  }

  async _removeCUBCondition(name) {
    if (settings.UseCUBEnhancedConditions.use && name !== NONE) {
      Log.debug(`Removing ${name}`)
      await game?.cub?.removeCondition(name, this.token, {warn: false})
    }
  }

  async _addCUBCondition(name) {
    if (settings.UseCUBEnhancedConditions.use && name !== NONE) {
      Log.debug(`Adding ${name}`)
      await game?.cub?.addCondition(name, this.token, {warn: false})
    }
  }

  async _removeCUBAllLevelsCondition(name) {
    if (settings.UseCUBEnhancedConditions.use && name !== NONE) {
      return this._getCUBConditions().reduce(async (acc, condition) => acc.then(_ => {
        if (condition.name.split(" ")[0].localeCompare(name) === 0) {
          return this._removeCUBCondition(condition.name)
        } else {
          Promise.resolve(void 0)
        }
      }), Promise.resolve(void 0))
    }
  }

  async _addCUBConditionWithLevel(name, level) {
    if (settings.UseCUBEnhancedConditions.use && name !== NONE) {
      await this._removeCUBAllLevelsCondition(name)
      await this._addCUBCondition(`${name} ${level}`)
    }
  }

  async _setCUBDying(level) {
    return this._addCUBConditionWithLevel(settings.CUBDyingConditionName.value, level)
  }

  async _removeCUBDying() {
    return this._removeCUBAllLevelsCondition(settings.CUBDyingConditionName.value)
  }

  async _setCUBExhaustion(level) {
    return this._addCUBConditionWithLevel(settings.CUBExhaustionConditionName.value, level)
  }

  async _removeCUBExhaustion() {
    return this._removeCUBAllLevelsCondition(settings.CUBExhaustionConditionName.value)
  }

  async _setCUBIncapacitated() {
    return this._addCUBCondition(settings.CUBIncapacitatedConditionName.value)
  }

  async _removeCUBIncapacitated() {
    return this._removeCUBCondition(settings.CUBIncapacitatedConditionName.value)
  }

  async _setCUBUnconscious() {
    return this._addCUBCondition(settings.CUBUnconsciousConditionName.value)
  }

  async _removeCUBUnconscious() {
    return this._removeCUBCondition(settings.CUBUnconsciousConditionName.value)
  }

  async _setCUBProne() {
    return this._addCUBCondition(settings.CUBProneConditionName.value)
  }

  async _removeCUBProne() {
    return this._removeCUBCondition(settings.CUBProneConditionName.value)
  }

  async _setCUBDead() {
    return this._addCUBCondition(settings.CUBDeadConditionName.value)
  }

  async _removeCUBDead() {
    return this._removeCUBCondition(settings.CUBDeadConditionName.value)
  }
}

async function onRenderHook(sheet) {
  await new ImprovedToken(sheet.token).update(sheet)
}

Hooks.on("renderActorSheet5eCharacter", onRenderHook)
