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
    await this.setDying(0)
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
    return this.modifyAttribute("dying", value)
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
    return this.modifyAttribute("exhaustion", value)
  }

  /**
   * @returns {Promise<number>}
   */
  async setDead() {
    return this.setDying(MAX_DYING + 1)
  }

  async increaseDying(amount = 1) {
    const dying = this.dying
    if (dying === 0) {
      //Maybe log some error
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
      //Maybe log some error
      return 0
    } else if (dying - amount < 1) {
      const exhaust = this.exhaustion
      //Actor is no longer dying
      return this.setHP(1)
        .then(_ => this.setExhaustion(exhaust + 1))
        .then(_ => this.setDying(0))
    } else {
      return this.setDying(dying - amount)
    }
  }

  async rollDeathSave() {
    const actor = this.token.actor
    if (this.hp !== 0) {
      //Give some error
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
}

async function onRenderHook(sheet) {
  await new ImprovedToken(sheet.token).update(sheet)
}

Hooks.on("renderActorSheet5eCharacter", onRenderHook)
