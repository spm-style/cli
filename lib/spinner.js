let Ora = require('ora')
let Chalk = require('chalk')
let CONST = require('./const')

class Spinner extends Ora {
  constructor (text, spinner) {
    super({ text, spinner })
    this.errorStop = function (message) {
      this.stop()
      return new Error(`😱   ${message}`)
    }
    this.successStop = function (message) {
      this.stopAndPersist({
        symbol: Chalk.hex(CONST.SUCCESS_COLOR)('✔'),
        text: message
      })
    }
  }
}

module.exports = Spinner
