import Settings from "./settings.js"
import Log from "./dying-condition.js"

/**
 * @param {function(t: A): Promise<B>} callback A function that transforms an element of the array into a Promise<B>
 * @returns {Promise<Array<B>>} A promise that contains all the results for applying callback to every member of the array
 * @template A
 * @template B
 */
Array.prototype.promiseTraverse = async function(callback) {
  return Promise.all(this.map(callback))
}

class GenericCondition {
  constructor(setting, hasLevels) {
    this._nameFN = () => setting.value
    this._useFN = () => setting.use
    this._hasLevels = hasLevels
  }

  get name() {
    return this._nameFN()
  }

  get use() {
    return this._useFN()
  }

  get hasLevels() {
    return this._hasLevels
  }
  /**
   *
   * @param token {DyingConditionActor}
   * @param name {string}
   * @returns {Promise<void>}
   * @protected
   */
  async _addCondition(token, name) {
    if (Settings.UseCUBEnhancedConditions.use) {
      Log.debug(`Adding ${this.name}`)
      return game?.cub?.addCondition(name, token, {warn: false})
    }
  }

  /**
   * @param token {DyingConditionActor}
   * @param name {string}
   * @returns {Promise<void>}
   * @protected
   */
  async _removeCondition(token, name) {
    if (Settings.UseCUBEnhancedConditions.use) {
      Log.debug(`Removing ${this.name}`)
      return game?.cub?.removeCondition(name, token, {warn: false})
    }
  }

  /**
   * Removes this condition from the given token.
   * @param token {DyingConditionActor} The token to remove the condition to
   * @returns {Promise<void>}
   */
  async removeCondition(token) {
  }
}

class Condition extends GenericCondition {

  constructor(setting) {
    super(setting, false)
  }

  /**
   * Adds a condition to the given token
   * @param token {DyingConditionActor} The token to add the condition to
   * @returns {Promise<void>}
   */
  async addCondition(token) {
    if (this.use) {
      await this._addCondition(token, this.name)
    }
  }

  /**
   * Removes a condition to the given token
   * @param token {DyingConditionActor} The token to remove the condition to
   * @returns {Promise<void>}
   */
  async removeCondition(token) {
    if (this.use) {
      await this._removeCondition(token, this.name)
    }
  }
}


class LeveledCondition extends GenericCondition {
  constructor(setting) {
    super(setting, true)
  }

  async removeCondition(token) {
    if (this.use) {
      await token.conditions.promiseTraverse(condition => {
        if (condition.name.split(" ")[0].localeCompare(this.name) === 0) {
          return this._removeCondition(token, condition.name)
        } else {
          return Promise.resolve(void 0)
        }
      })
    }
  }

  /**
   * Adds a condition at a given level
   * @param token {DyingConditionActor} The token to add the condition to
   * @param level {number}
   * @returns {Promise<void>} A promise that when completed removes all conditions with the given name. And adds a single
   * one with the given level.
   */
  async addCondition(token, level) {
    if (this.use) {
      await this.removeCondition(token)
      await this._addCondition(token, `${this.name} ${level}`)
    }
  }
}

const Conditions = {
  Dying: new LeveledCondition(Settings.CUBDyingConditionName),
  Exhaustion: new LeveledCondition(Settings.CUBExhaustionConditionName),
  Incapacitated: new Condition(Settings.CUBIncapacitatedConditionName),
  Unconscious: new Condition(Settings.CUBUnconsciousConditionName),
  Prone: new Condition(Settings.CUBProneConditionName),
  Dead: new Condition(Settings.CUBDeadConditionName),
}

Object.freeze(Conditions)
Object.freeze(GenericCondition)
Object.freeze(LeveledCondition)
Object.freeze(Condition)

export default Conditions