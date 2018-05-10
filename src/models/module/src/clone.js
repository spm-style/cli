let Path = require('path')
let Request = require('request')
let Preferences = require('preferences')
let CONST = require('../../../lib/const')
let Debug = require('../../../lib/debug')
let Common = require('../../../lib/common')

/* requests the spm registry for a package's json file */
let getJsonPackageFromAPIPromise = (clone) => {
  if (clone.debug) { Debug() }
  return new Promise((resolve, reject) => {
    if (clone.version) {
      return resolve(clone)
    } else {
      let url = `${CONST.PACKAGE_URL}/install/${clone.name}`
      Request({
        url,
        headers: {
          'Authorization': `bearer ${new Preferences(CONST.PREFERENCES).token}`
        }
      }, (err, response, body) => {
        try {
          body = JSON.parse(body)
          if (err) {
            if (err.code === 'ECONNREFUSED') { return reject(new Error('Server down check method getJsonApiPromise')) } else { return reject(err) }
          } else if (Math.floor(body.statusCode / 100) >= 4) {
            return reject(new Error(`API error for package ${clone.name}: ${body.message}`))
          } else {
            clone.version = body.version
            return resolve(clone)
          }
        } catch (e) { return reject(e) }
      })
    }
  })
}

/* MODULE CLONE : to download the source files of a published module */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('clone')
    .description(`to download the source files of a published module`)
    .arguments('<moduleName>')
    .option('--version, -v', `to specify the module's version`)
    .option('--debug', 'to display debug logs')
    .action((moduleName, options) => {
      let clone = {
        name: moduleName,
        version: typeof options.version === 'function' ? null : options.version,
        debug: options.debug,
        successes: [],
        warnings: []
      }
      getJsonPackageFromAPIPromise(clone)
      .then(() => Common.downloadModuleSpmPromise(clone.name, clone.version, Path.join(Common.getCurrentPath(), clone.name), true))
      .then(() => {
        clone.successes.push(`${clone.name} source files imported in ${clone.name} folder`)
        Common.displayMessagesPromise(clone)
        .then(resolve)
        .catch(reject)
      })
      .catch(reject)
    })
  })
}
