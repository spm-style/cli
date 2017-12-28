let Chalk = require('chalk')
let Prompt = require('inquirer').prompt
let Request = require('request')
let CONST = require('./const')
let Authentify = require('./authentify')

/* Commander for spm unpublish */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('unpublish')
    .description(`to remove a package you're contributing to`)
    .arguments('<pkg>')
    .action(pkg => {
      let name = pkg.indexOf('@') >= 0 ? pkg.substring(0, pkg.indexOf('@')) : pkg
      let version = pkg.indexOf('@') >= 0 ? pkg.substring(pkg.indexOf('@')) : null
      if (version && /^[0-9]+[.][0-9]+[.][0-9]+$/.test(version)) { return reject(new Error(`incorrect version ${version} - format must be x.x.x`)) }
      Prompt([{
        type: 'confirm',
        message: `Are you sure you want to delete ${pkg}`,
        name: 'confirmation'
      }])
      .then(answer => {
        if (answer.confirmation) {
          Authentify.login()
          .then(token => {
            Request({
              method: 'DELETE',
              headers: {
                'Authorization': `bearer ${token}`
              },
              url: `${CONST.PACKAGE_ORIGIN_URL}/${name}${version ? '?version=' + version : ''}`
            }, (err, res, body) => {
              if (err) { return reject(err) }
              if (Math.floor(res.statusCode / 100) === 4) {
                return reject(new Error(res.message))
              } else {
                console.log(`${Chalk.hex(CONST.SUCCESS_COLOR)('SUCCESS')}: package ${pkg} has been unpublished`)
                return resolve(pkg)
              }
            })
          })
          .catch(reject)
        } else { return resolve(pkg) }
      })
      .catch(reject)
    })
    .on('--help', function () {})
  })
}
