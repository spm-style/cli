let Fs = require('fs')
let Path = require('path')
let Chalk = require('chalk')
let Prompt = require('inquirer').prompt
let CONST = require('../../../lib/const')
let Debug = require('../../../lib/debug')
let Common = require('../../../lib/common')

/* Checks where json file is to define the module's or project's scope */
let findJsonFilePromise = (version) => {
  if (version.debug) { Debug() }
  return new Promise((resolve, reject) => {
    version.pathInitial = Common.getCurrentPath()
    Common.findProjectJsonPromise(version.pathInitial)
    .then(path => {
      version.pathProject = path
      Common.findModuleJsonPromise(version.pathInitial)
      .then(path => {
        version.pathModule = path
        version.pathFinal = version.pathModule || version.pathProject || version.pathInitial
        version.pathModules = Path.join(version.pathFinal, 'spm_modules')
        if (!version.pathProject && !version.pathModule) {
          version.warnings.push('no module or project detected - version in current path')
          Common.findModulesPromise(version.pathInitial)
          .then(path => {
            version.pathModules = path
            if (!path) { return reject(new Error(`no installed module - no instance to version`)) }
            return resolve(version)
          })
        } else {
          version.pathPackage = Path.join(version.pathFinal, version.pathModule ? CONST.MODULE_JSON_NAME : CONST.PROJECT_JSON_NAME)
          return resolve(version)
        }
      })
      .catch(reject)
    })
    .catch(reject)
  })
}

/* parses json file and find the module's or project's version */
let parseJsonFilePromise = (version) => {
  if (version.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Fs.readFile(version.pathPackage, 'utf8', (err, data) => {
      if (err) { return reject(err) }
      try { version.jsonFile = JSON.parse(data) } catch (e) { return reject(e) }
      if (!version.jsonFile.version) {
        Prompt([{
          message: `no version found in your package-spm.json - manually enter it :`,
          name: 'version',
          default: '1.0.0',
          /* version should have format MAJOR.MINOR.PATCH with all of them being integers */
          validate: (value) => {
            return ((/^[0-9]+[.][0-9]+[.][0-9]+$/.test(value)) ? true : Chalk.hex(CONST.WARNING_COLOR)('valid version format: x.x.x'))
          }
        }])
        .then(answer => {
          version.version = answer.version
          return resolve(version)
        })
        .catch(reject)
      } else {
        version.version = version.jsonFile.version
        return resolve(version)
      }
    })
  })
}

/* updates the package version and writes it */
let updatePackageSpmPromise = (version) => {
  if (version.debug) { Debug() }
  return new Promise((resolve, reject) => {
    let position
    switch (version.updateType.toLowerCase()) {
      case 'patch':
        position = 2
        break
      case 'minor':
        position = 1
        break
      case 'major':
        position = 0
        break
      default:
        break
    }
    version.initialVersion = version.jsonFile.version
    let versions = version.jsonFile.version.split('.')
    versions[position] = Number(versions[position]) + 1
    for (let minorPosition = position + 1; minorPosition < 3; minorPosition++) { versions[minorPosition] = 0 }
    version.jsonFile.version = versions.join('.')
    Common.writeContent(JSON.stringify(version.jsonFile, null, '  ') + '\n', version.pathPackage, '', version)
    .then(version => {
      version.successes.push(`your project version has been updated from ${version.initialVersion} to ${version.jsonFile.version}`)
      return resolve(version)
    })
    .catch(reject)
  })
}

/* PROJECT VERSION : to update a module's version patch, minor, or major value */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('version')
    .alias('v')
    .description(`to update a module's version patch, minor, or major value`)
    .arguments('<updateType>')
    .option('--debug', 'to display debug logs')
    .action((updateType, options) => {
      if (!updateType ||
        (updateType.toLowerCase() !== 'patch' &&
        updateType.toLowerCase() !== 'minor' &&
        updateType.toLowerCase() !== 'major')) {
        return reject(new Error(`updateType should have a case-insensitive value among PATCH, MINOR or MAJOR`))
      }
      findJsonFilePromise({ updateType, debug: options.debug === true, successes: [], warnings: [] })
      .then(parseJsonFilePromise)
      .then(updatePackageSpmPromise)
      .then(Common.displayMessagesPromise)
      .catch(reject)
    }).on('--help', function () { console.log('\nupdateType should have a case-insensitive value among PATCH, MINOR or MAJOR\n') })
  })
}
