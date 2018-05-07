const Chalk = require('chalk')
let Preferences = require('preferences')
const CONST = require('../../../lib/const')

/* logouts the user from preferences and clean its information */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('logout')
    .description('to disconnect from spm')
    .action(() => {
      let prefs = new Preferences(CONST.PREFERENCES)
      if (!prefs || !Object.keys(prefs).length) {
        console.log(Chalk.hex(CONST.WARNING_COLOR)('you are already disconnected'))
        return resolve()
      } else {
        lets keys = ['token', 'user', 'email']
        for (let key of keys) { delete prefs[key] }
        prefs.save()
        console.log('user disconnected - come again soon 👻')
        return resolve()
      }
    })
  })
}
