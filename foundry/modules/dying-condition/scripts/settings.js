import {KEY} from "./module.js"

export const SETTINGS_UPDATED = KEY + '.SettingsUpdated'
export const SETTING_KEY = `${KEY}.setting.`

function refresh() {
  Hooks.callAll(SETTINGS_UPDATED)
}

class Setting {
  static all = []
  constructor(type, key, defaultValue, hasHint, choices) {
    this.type = type
    this.key = key
    this.hasHint = hasHint
    this.defaultValue = defaultValue
    this.choices = choices
    Settings.all.push(this)
  }

  register() {
    const name = game.i18n.localize(`${SETTING_KEY}${this.key}.label`)
    const hint = this.hasHint ? game.i18n.localize(`${SETTING_KEY}${this.key}.hint`) : null
    const choices = this.choices.length === 0 ? null : this.choices.reduce((acc, choice) => {
      acc[`${choice}`] = choice
      return acc
    }, {})
    game.settings.register(KEY, this.key, {
      name: name,
      hint: hint,
      scope: "world",
      config: true,
      default: this.defaultValue,
      type: this.type,
      choices: choices,
      onChange: refresh,
    })
  }

  get value() {
    return game.settings.get(KEY, this.key)
  }
}

class BooleanSetting extends Setting {
  constructor(key, defaultValue, hasHint = false) {
    super(Boolean, key, defaultValue, hasHint, [])
    this.key = key
    this.hasHint = hasHint
    this.defaultValue = defaultValue
  }
  get use() {
    return this.value
  }
}

class ConditionSetting extends Setting {
  constructor(key, defaultValue, hasHint, choices = []) {
    super(String, key, ifExists(defaultValue), hasHint, choices)
  }

  get use() {
    return this.value !== NONE
  }
}

let conditions
export let NONE
let allConditions

function ifExists(condition) {
  const found = allConditions.find(cond => cond.localeCompare(condition) === 0)
  return found ? found : NONE
}

class Settings {
  static all = []
  UseCUBEnhancedConditions = new BooleanSetting("useEnhancedConditions", !!game?.cub, true)

  CUBDyingConditionName = new ConditionSetting("dyingConditionName", "Dying", true, allConditions)

  CUBExhaustionConditionName = new ConditionSetting("exhaustionConditionName", "Exhaustion", true, allConditions)

  CUBIncapacitatedConditionName = new ConditionSetting("incapacitatedConditionName", "Incapacitated", false, allConditions)

  CUBUnconsciousConditionName = new ConditionSetting("unconsciousConditionName", "Unconscious", false, allConditions)

  CUBProneConditionName = new ConditionSetting("proneConditionName", "Prone", false, allConditions)

  CUBDeadConditionName = new ConditionSetting("deadConditionName", "Dead", true, allConditions)
}

export let settings

Hooks.once('ready', () => {
  conditions = game?.cub?.conditions ? game.cub.conditions.map(condition => condition.name.split(" ")[0]) : []
  NONE = game.i18n.localize(`${SETTING_KEY}noCondition.label`)
  allConditions = [NONE, ...new Set(conditions.filter(c => c !== ""))]
  settings = new Settings()
  Object.freeze(settings)
  Settings.all.forEach(setting => setting.register())
})