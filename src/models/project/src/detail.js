let Fs = require('fs')
let Path = require('path')
let Common = require('../../../lib/common')
let CONST = require('../../../lib/const')

/* PROJECT DETAIL : to access a project's general information */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('detail')
    .alias('d')
    .description(`to access a project's general information`)
    .action(options => {
      Common.findProjectJsonPromise(Common.getCurrentPath())
      .then(path => {
        if (!path) { return reject(new Error(CONST.ERROR.SPM_PROJECT_NOT_FOUND)) }
        Fs.readFile(Path.join(path, CONST.PROJECT_JSON_NAME), 'utf8', (err, data) => {
          if (err) { return reject(err) }
          console.log(data)
          return resolve(data)
        })
      })
      .catch(reject)
    })
  })
}
