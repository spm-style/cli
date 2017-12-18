let Ora = require('ora')

class Spinner extends Ora {
  constructor (text, spinner) {
    super({ text, spinner })
    this.errorStop = function (message) {
      this.stop()
      return new Error(`😱   ${message}`)
    }
  }
}

module.exports = {
  Spinner
}
