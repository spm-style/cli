'use strict'
let Authentify = require('./authentify')

/* Command line for spm user */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('user')
    .arguments('[command]', '"info" for current user information')
    .description('used to register or login') // logout in v2
    .action(command => {
      if (command === 'info') {
        Authentify.getCurrentUserInfo()
        .then(resolve)
        .catch(reject)
      } else {
        Authentify.getSpmAPIToken(true)
        .then(resolve)
        .catch(reject)
      }
    })
    .on('--help', function () {
    })
  })
}
