let Authentify = require('../lib/authentify')

/* uses getSpmAPIToken to login a user and save it in preferences */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('login')
    .alias('l')
    .description('to authentify yourself')
    .action(options => {
      Authentify.getSpmAPIToken('login', true)
      .then(resolve)
      .catch(reject)
    })
  })
}
