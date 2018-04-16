let Fs = require('fs')
let Path = require('path')
let Common = require('../../../lib/common')
let CONST = require('../../../lib/const')

/* PROJECT DETAIL : to display information about a module */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('detail')
    .alias('d')
    .description(`to display information about a module`)
    .action(() => {
      Common.findModuleJsonPromise(Common.getCurrentPath())
      .then(path => {
        if (!path) { return reject(new Error(CONST.ERROR.SPM_MODULE_NOT_FOUND)) }
        Fs.readFile(Path.join(path, CONST.MODULE_JSON_NAME), 'utf8', (err, data) => {
          if (err) { return reject(err) }
          console.log(data)
          return resolve(data)
        })
      })
      .catch(reject)
    })
  })
}
