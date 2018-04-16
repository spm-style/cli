let Chalk = require('chalk')
let Request = require('request')
let Prompt = require('inquirer').prompt
let CONST = require('../../../lib/const')
let Debug = require('../../../lib/debug')
let Authentify = require('../../user/lib/authentify')

/* PROJECT UNPUBLISH : to remove a module's version or a whole module from spm registry */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('unpublish')
    .description(`to remove a module's version or a whole module from spm registry`)
    .arguments('<module>')
    .option('--debug', 'to display debug logs')
    .action((module, options) => {
      if (options.debug) { Debug(module) }
      let name = module.indexOf('@') >= 0 ? module.substring(0, module.indexOf('@')) : module
      let version = module.indexOf('@') >= 0 ? module.substring(module.indexOf('@') + 1) : null
      if (version && !/^[0-9]+[.][0-9]+[.][0-9]+$/.test(version)) { return reject(new Error(`incorrect version ${version} - format must be x.x.x`)) }
      Prompt([{
        type: 'confirm',
        message: `Are you sure you want to delete ${module}`,
        name: 'confirmation',
        default: false
      }])
      .then(answer => {
        if (answer.confirmation) {
          if (options.debug) { Debug(name, version) }
          Authentify.getSpmAPIToken('login')
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
              try {
                let json = JSON.parse(body)
                if (json.statusCode >= 400) {
                  return reject(new Error(json.message))
                } else {
                  console.log(`\n${Chalk.hex(CONST.SUCCESS_COLOR)('SUCCESS')}: ${json.message}\n`)
                  return resolve(module)
                }
              } catch (e) { return reject(e) }
            })
          })
          .catch(reject)
        } else { return resolve(module) }
      })
      .catch(reject)
    }).on('--help', function () {})
  })
}
