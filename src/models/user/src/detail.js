let Preferences = require('preferences')
const CONST = require('../../../lib/const')
let Authentify = require('../lib/authentify')
let Prompt = require('inquirer').prompt

/* uses local preferences file to display user information without password */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('detail')
    .alias('d')
    .action(() => {
      let prefs = new Preferences(CONST.PREFERENCES)
      if (!prefs.user) {
        Prompt([{
          name: 'authentify',
          type: 'confirm',
          message: 'no user detected, do you want to login ?'
        }])
        .then(answer => {
          if (answer.authentify) { Authentify.getSpmAPIToken('login').then(resolve).catch(reject) } else { return resolve() }
        })
        .catch(reject)
      } else {
        let table = ['🔹', '🔸']
        let i = 0
        for (let key in prefs) {
          if (key !== 'token') {
            i++
            console.log(`${table[i % 2]}  ${key}: ${prefs[key]}`)
          }
        }
        return resolve()
      }
    })
  })
}
