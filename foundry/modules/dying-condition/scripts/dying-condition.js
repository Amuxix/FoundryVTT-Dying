import ActorSheet5eCharacter from "../../../systems/dnd5e/module/actor/sheets/character.js"
import DyingConditionCharacterSheet from "./dying-condition-actor-sheet.js"
import DyingConditionActor from "./dying-condition-actor.js"
import Conditions from "./conditions.js"

export const NAME = "Dying Condition"
export const KEY = "dying-condition"
export const MAX_DYING = 5

export default class Log {
  static _log(logger, ...args) {
    //logger.apply(console, [`%c${NAME} |`, 'color: rgba(255, 255, 255, 255);', arg])
    logger.apply(console, [`${NAME} |`, ...args])
  }

  static debug(...args) {
    this._log(console.debug, ...args)
  }

  static info(...args) {
    this._log(console.info, ...args)
  }

  static error(...args) {
    this._log(console.error, ...args)
  }
}

Hooks.once('init', () => {
  Log.debug("Initializing Dying Condition")

  Handlebars.registerHelper("dyingCondition", (state) => {
    if (typeof state === "undefined") {
      return `modules/${KEY}/templates/parts/alive.html`
    } else {
      return `modules/${KEY}/templates/parts/${state}.html`
    }
  })

  // Record Configuration Values
  CONFIG.Actor.entityClass = DyingConditionActor

  //Register Sheets
  Actors.unregisterSheet("dnd5e", ActorSheet5eCharacter);
  Actors.registerSheet(KEY, DyingConditionCharacterSheet, {types: ['character'], makeDefault: true, label: `${KEY}.sheetLabel`})

  // Preload Handlebars Templates
  loadTemplates([
    `modules/${KEY}/templates/parts/alive.html`,
    `modules/${KEY}/templates/parts/dead.html`,
    `modules/${KEY}/templates/parts/dying.html`,
    `modules/${KEY}/templates/parts/stable.html`,
  ])
})

Hooks.on("updateActor", async (actor, data, options) => {
  const attributes = data?.data?.attributes
  if (typeof attributes?.hp !== "undefined" || typeof attributes?.dying !== "undefined") {
    await actor.updateState()
  }
  if (typeof attributes?.dying !== "undefined") {
    await actor.addLeveledCondition(Conditions.Dying, actor.dying)
  }
  if (typeof attributes?.exhaustion !== "undefined") {
    await actor.addLeveledCondition(Conditions.Exhaustion, actor.exhaustion)
  }
})
