let Chalk = require('chalk')
let Prompt = require('inquirer').prompt
let Request = require('request')
let CONST = require('./const')
let Authentify = require('./authentify')
let Debug = require('./debug')

/* Commander for spm unpublish */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('unpublish')
    .description(`to remove a package you're contributing to`)
    .arguments('<pkg>')
    .option('--debug', 'to display debug logs')
    .action((pkg, options) => {
      if (options.debug) { Debug(pkg) }
      let name = pkg.indexOf('@') >= 0 ? pkg.substring(0, pkg.indexOf('@')) : pkg
      let version = pkg.indexOf('@') >= 0 ? pkg.substring(pkg.indexOf('@') + 1) : null
      if (version && !/^[0-9]+[.][0-9]+[.][0-9]+$/.test(version)) { return reject(new Error(`incorrect version ${version} - format must be x.x.x`)) }
      Prompt([{
        type: 'confirm',
        message: `Are you sure you want to delete ${pkg}`,
        name: 'confirmation'
      }])
      .then(answer => {
        if (answer.confirmation) {
          if (options.debug) { Debug(name, version) }
          Authentify.login()
          .then(token => {
            Request({
              method: 'DELETE',
              headers: {
                'Authorization': `bearer ${token}`
              },
              url: `${CONST.PUBLISH_URL}/${name}${version ? '?version=' + version : ''}`
            }, (err, res, body) => {
              if (err) { return reject(err) }
              if (options.debug) { Debug(body) }
              let json = JSON.parse(body)
              if (json.statusCode >= 400) {
                return reject(new Error(json.message))
              } else {
                console.log(`${Chalk.hex(CONST.SUCCESS_COLOR)('SUCCESS')}: ${json.message}`)
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
