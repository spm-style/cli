'use strict'
let Authentify = require('./authentify')

/* Command line for spm user */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('user')
    .description('used to register') // login and logout in v2 [preferences]
    .action(() => {
      Authentify(true)
      .then(resolve)
      .catch(reject)
    })
    .on('--help', function () {
    })
  })
}
