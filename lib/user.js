'use strict'
let Authentify = require('./authentify')

/* Commander for spm user */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('user')
    .arguments('[command]', '"info" for current user information')
    .description('used to register or login or logout') // logout in v2
    .action(command => {
      switch (command) {
        case 'info':
          Authentify.getCurrentUserInfo()
          .then(resolve)
          .catch(reject)
          break
        case 'logout':
          Authentify.logout()
          .then(resolve)
          .catch(reject)
          break
        default:
          Authentify.getSpmAPIToken(true)
          .then(resolve)
          .catch(reject)
          break
      }
    })
    .on('--help', function () {
    })
  })
}
