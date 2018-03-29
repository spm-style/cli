let Authentify = require('../lib/authentify')

/* uses getSpmAPIToken to login a user and save it in preferences */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('login')
    .alias('l')
    .description('to authentify yourself')
    .option('-f, --force', 'to login even if there is already another session up')
    .action(options => {
      Authentify.getSpmAPIToken('login', options.force)
      .then(resolve)
      .catch(reject)
    })
  })
}
