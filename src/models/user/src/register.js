let Authentify = require('../lib/authentify')

/* uses getSpmAPIToken to register a user and save it in preferences */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('register')
    .description('to create a new spm user account')
    .action(() => {
      Authentify.getSpmAPIToken('register', true)
      .then(resolve)
      .catch(reject)
    })
  })
}
