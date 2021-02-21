import Actor5e from "../../../systems/dnd5e/module/actor/entity.js"
import {Alive, Dead, Dying, Stable} from "./state.js"
import Log, {MAX_DYING} from "./dying-condition.js"
import Conditions from "./conditions.js"

export default class DyingConditionActor extends Actor5e {
  constructor(...args) {
    super(...args)
    Log.info("this.data.type", this.data.type)
    Log.info("this", this)
  }

  _prepareCharacterData(actorData) {
    super._prepareCharacterData(actorData) //This mutates actorData
    const state = actorData.data.attributes.state
    if (typeof state === "undefined") {
      Log.debug("Setting actor as alive as no state was found")
      actorData.data.attributes.state = Alive
    }
  }

  /**
   *
   * @returns {Promise<void>}
   * @private
   */
  async _noChange() {
    Log.debug("No change")
    return Promise.resolve(void 0)
  }

  /**
   * @returns {Promise<void>}
   * @private
   */
  async _updateWhenAlive() {
    Log.debug("Updating actor with Alive state")
    if (this.hp > 0) {
      return this._noChange()
    } else if (this.exhaustion === 5) {
      return this.kill() // Token has no HP and is above max dying and dies from exhaustion
    } else {
      return this.injure() //Token is dying
    }
  }

  /**
   * @returns {Promise<void>}
   * @private
   */
  async _updateWhenStable() {
    Log.debug("Updating actor with Stable state")
    //TODO Handle taking damage while stable
    if (this.hp > 0) {
      return this.heal()
    } else {
      return this._noChange()
    }
  }

  /**
   * @returns {Promise<void>}
   * @private
   */
  async _updateWhenDying() {
    Log.debug("Updating actor with Dying state")
    if (this.hp > 0) {
      return this.heal()
    } else {
      const dying = this.dying
      if (dying === 0) {
        return this.stabilize()
      } else if (dying > MAX_DYING) {
        return this.kill()
      } else {
        return this._noChange()
      }
    }
  }

  /**
   * @returns {Promise<void>}
   * @private
   */
  async _updateWhenDead() {
    Log.debug("Updating actor with Dead state")
    if (this.hp > 0) {
      return this.heal()
    } else {
      return this._noChange()
    }
  }

  async applyDamage(amount = 0, multiplier = 1) {
    const reducedAmount = Math.floor(parseInt(amount) * multiplier);
    if (reducedAmount >= this.hp + this.attributes.hp.max + this.attributes.hp.temp) {
      Log.debug(`Actor too enough damage for insta death, ${reducedAmount}/${this.hp + this.attributes.hp.max + this.attributes.hp.temp}`)
      await this.kill()
    } else if (this.hp <= 0 && reducedAmount >= 1) {
      Log.debug("Dealing damage to actor with 0 HP")
      await this.injure()
    }
    return super.applyDamage(amount, multiplier)
  }

  /**
   * Updates the status of this token
   * @returns {Promise<void>} The new state of the token
   */
  async updateState() {
    switch (this.state) {
      case Alive:
        return this._updateWhenAlive()
      case Stable:
        return this._updateWhenStable()
      case Dying:
        return this._updateWhenDying()
      case Dead:
        return this._updateWhenDead()
    }
  }

  /**
   * Represents going from alive, dying,stable to dead
   * @returns {Promise<void>}
   */
  async kill() {
    if (this.state === Dead) {
      Log.error("Trying to kill actor that is already dead!")
      return Promise.resolve(void 0)
    }
    Log.debug("Killing actor")
    await this.addConditions(Conditions.Dead)
    await this.removeConditions(Conditions.Unconscious,Conditions.Incapacitated, Conditions.Prone)
    await this.setState(Dead)
  }

  /**
   * Represents going from dying to stable
   * @returns {Promise<void>}
   */
  async stabilize() {
    if (this.state !== Dying) {
      Log.error("Trying to stabilize actor that is not dying!")
      return Promise.resolve(void 0)
    }
    Log.debug("Stabilizing actor")
    // Removing dying increases exhaustion
    await this.setExhaustion(this.exhaustion + 1)
    await this.removeCondition(Conditions.Dying)
    await this.setState(Stable)
  }

  /**
   * Represents going from dead, dying or stable to alive
   * @returns {Promise<void>}
   */
  async heal() {
    if (this.state === Alive) {
      Log.error("Trying to heal actor that is already alive!")
      return Promise.resolve(void 0)
    }
    Log.debug("Healing actor")
    if (this.state === Dying) {
      // Removing dying increases exhaustion
      await this.setExhaustion(this.exhaustion + 1)
    }

    await this.removeConditions(Conditions.Dead, Conditions.Unconscious, Conditions.Incapacitated, Conditions.Dying)
    await this.setState(Alive)
  }

  /**
   * Represents going from alive, dying or stable to dead or dying
   * @returns {Promise<void>}
   */
  async injure() {
    if (this.state === Dead) {
      Log.error("Trying to injure dead actor!")
      return Promise.resolve(void 0)
    }
    Log.debug("Injuring actor")
    //If actor is dying simple increase dying by 1, if actor is stable or alive set his dying to be exhaustion + 1
    const dying = this.state === Dying ? this.dying + 1 : this.exhaustion + 1
    if (dying > MAX_DYING) {
      return this.kill()
    } else {
      await this.addConditions(Conditions.Unconscious, Conditions.Incapacitated, Conditions.Prone)
      await this.setState(Dying)
      return this.setDying(dying)
    }
  }

  async modifyAttribute(attribute, value) {
    return this.modifyTokenAttribute(`attributes.${attribute}`, value, false, false)
  }

  get attributes() {
    return this.data.data.attributes
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
   * @param state {String}
   * @returns {Promise<void>}
   */
  async setState(state) {
    await this.modifyAttribute("state", state)
  }


  /**
   * @returns {number}
   */
  get dying() {
    return this.attributes.dying
  }

  /**
   *
   * @param dying {number}
   * @returns {Promise<void>}
   */
  async setDying(dying) {
    await this.modifyAttribute("dying", dying)
  }

  /**
   * @returns {number}
   */
  get exhaustion() {
    return this.attributes.exhaustion
  }
  /**
   *
   * @param exhaustion {number}
   * @returns {Promise<void>}
   */
  async setExhaustion(exhaustion) {
    await this.modifyAttribute("exhaustion", exhaustion)
  }

  get conditions() {
    const conditionsObject = game?.cub?.getConditions(this, {warn: false})
    if (conditionsObject === null || typeof conditionsObject.conditions === 'undefined') {
      return []
    } else if (Array.isArray(conditionsObject.conditions)) {
      return conditionsObject.conditions
    } else {
      return [conditionsObject.conditions]
    }
  }

  /**
   * Adds the given condition to this token
   * @param condition {Condition}
   * @returns {Promise<void>}
   */
  async addCondition(condition) {
    return condition.addCondition(this)
  }

  /**
   * Adds the given condition to this token
   * @param condition {LeveledCondition}
   * @param level {number}
   * @returns {Promise<void>}
   */
  async addLeveledCondition(condition, level) {
    return condition.addCondition(this, level)
  }

  /**
   * Removes the given condition from this token
   * @param condition {GenericCondition}
   * @returns {Promise<void>}
   */
  async removeCondition(condition) {
    return condition.removeCondition(this)
  }

  /**
   * Adds the given conditions to this token
   * @param conditions {Condition}
   * @returns {Promise<void>}
   */
  async addConditions(...conditions) {
    return conditions.promiseTraverse(condition => condition.addCondition(this))
  }

  /**
   * Removes the given conditions from this token
   * @param conditions {GenericCondition}
   * @returns {Promise<void>}
   */
  async removeConditions(...conditions) {
    return conditions.promiseTraverse(condition => condition.removeCondition(this))
  }
}