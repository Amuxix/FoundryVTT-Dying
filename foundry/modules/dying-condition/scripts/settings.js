import {KEY} from "./dying-condition.js"

class Setting {
  static all = []
  constructor(type, key, defaultValueFn, hasHint, choices) {
    this.type = type
    this.key = key
    this.hasHint = hasHint
    this.defaultValueFn = defaultValueFn
    this.choicesFn = choices
    Setting.all.push(this)
  }

  register() {
    const name = game.i18n.localize(`${KEY}.setting.${this.key}.label`)
    const hint = this.hasHint ? game.i18n.localize(`${KEY}.setting.${this.key}.hint`) : null
    const choiceArray = this.choicesFn()
    const choices = choiceArray.length === 0 ? null : choiceArray.reduce((acc, choice) => {
      acc[`${choice}`] = choice
      return acc
    }, {})
    game.settings.register(KEY, this.key, {
      name: name,
      hint: hint,
      scope: "world",
      config: true,
      default: this.defaultValueFn(),
      type: this.type,
      choices: choices,
      onChange: () => void 0,
    })
  }

  get value() {
    return game.settings.get(KEY, this.key)
  }
}

class BooleanSetting extends Setting {
  constructor(key, defaultValue, hasHint = false) {
    super(Boolean, key, () => defaultValue, hasHint, () => [])
    this.key = key
    this.hasHint = hasHint
    this.defaultValue = defaultValue
  }
  get use() {
    return this.value
  }
}

class ConditionSetting extends Setting {
  constructor(key, defaultValue, hasHint, choices = () => []) {
    super(String, key, () => ifExists(defaultValue), hasHint, choices)
  }

  get use() {
    return this.value !== NONE()
  }
}

let _NONE = null
function NONE() {
  if (_NONE === null) {
    return game.i18n.localize(`${KEY}.setting.noCondition.label`)
  }
  return _NONE
}

let _conditions = null
function conditions() {
  if (_conditions === null) {
    let conditions = []
    if (game?.cub?.conditions) {
      conditions = game.cub.conditions.map(condition => condition.name.split(" ")[0]).filter(c => c !== "")
    }
    _conditions = [NONE(), ...new Set(conditions)]
  }
  return _conditions
}

function ifExists(condition) {
  const found = conditions().find(cond => cond.localeCompare(condition) === 0)
  return found ? found : NONE()
}

const Settings = {
  UseCUBEnhancedConditions: new BooleanSetting("useEnhancedConditions", !!game?.cub, true),

  CUBDyingConditionName: new ConditionSetting("dyingConditionName", "Dying", true, conditions),

  CUBExhaustionConditionName: new ConditionSetting("exhaustionConditionName", "Exhaustion", true, conditions),

  CUBIncapacitatedConditionName: new ConditionSetting("incapacitatedConditionName", "Incapacitated", false, conditions),

  CUBUnconsciousConditionName: new ConditionSetting("unconsciousConditionName", "Unconscious", false, conditions),

  CUBProneConditionName: new ConditionSetting("proneConditionName", "Prone", false, conditions),

  CUBDeadConditionName: new ConditionSetting("deadConditionName", "Dead", true, conditions)
}

Object.freeze(Settings)
export default Settings

Hooks.once('ready', () => Setting.all.forEach(setting => setting.register()))