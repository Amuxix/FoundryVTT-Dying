export const NAME = "Dying Condition"
export const KEY = "dying-condition"

export class Log {
  static _log(logger, arg) {
    //logger.apply(console, [`%c${NAME} |`, 'color: rgba(255, 255, 255, 255);', arg])
    logger.apply(console, [`${NAME} |`, arg])
  }

  static debug(arg) {
    this._log(console.debug, arg)
  }

  static info(arg) {
    this._log(console.info, arg)
  }

  static error(arg) {
    this._log(console.error, arg)
  }
}