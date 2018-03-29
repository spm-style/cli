let Ora = require('ora')
let Chalk = require('chalk')
let CONST = require('../../../lib/const')

/* SPINNER class to wait during api requests */
class Spinner extends Ora {
  constructor (text, spinner) {
    super({ text, spinner })
    /* implements the spinner stop and throws custom error */
    this.errorStop = function (message) {
      this.stop()
      return new Error(`😱   ${message}`)
    }
    /* implements the spinner stop and displays success tick + message */
    this.successStop = function (message) {
      this.stopAndPersist({
        symbol: Chalk.hex(CONST.SUCCESS_COLOR)('✔'),
        text: message
      })
    }
  }
}

module.exports = Spinner
