let Fs = require('fs')
let Chalk = require('chalk')
let Inquirer = require('inquirer')
let Common = require('./common')
let CONST = require('./const')
let Debug = require('./debug')

/* Checks where package-spm.json file is to define the project's scope */
let findPackageSpmPromise = (version) => {
  if (version.debug) { Debug() }
  return new Promise((resolve, reject) => {
    let currentDirectory = Common.getCurrentPath()
    if (currentDirectory.indexOf(CONST.USER_DIRECTORY) === -1) {
      return reject(new Error(CONST.ERROR.OUT_OF_SCOPE))
    }
    while (currentDirectory !== CONST.USER_DIRECTORY) {
      if (Fs.existsSync(currentDirectory + '/package-spm.json')) {
        version.pathPackage = currentDirectory + '/package-spm.json'
        return resolve(version)
      }
      currentDirectory = currentDirectory.substring(0, currentDirectory.lastIndexOf('/'))
    }
    return reject(CONST.ERROR.SPM_PACKAGE_NOT_FOUND)
  })
}

/* parses package-spm.json and find the project's version */
let parsePackageSpmPromise = (version) => {
  if (version.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Fs.readFile(version.pathPackage, 'utf8', (err, data) => {
      if (err) { return reject(err) }
      version.jsonFile = JSON.parse(data)
      if (!version.jsonFile.version) {
        Inquirer.prompt([{
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
    version.jsonFile.version = versions.join('.')
    Common.writeContent(JSON.stringify(version.jsonFile, null, '  ') + '\n', version.pathPackage, '', version)
    .then(version => {
      version.successes.push(`your project version has been updated from ${version.initialVersion} to ${version.jsonFile.version}`)
      return resolve(version)
    })
    .catch(reject)
  })
}

/* Commander for spm version */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('version')
    .alias('v')
    .description(`to update your project's version`)
    .arguments('<updateType>')
    .option('--debug', 'to display debug logs')
    .action((updateType, options) => {
      if (!updateType ||
        (updateType.toLowerCase() !== 'patch' &&
        updateType.toLowerCase() !== 'minor' &&
        updateType.toLowerCase() !== 'major')) {
        return reject(new Error(`updateType should have a case-insensitive value among PATCH, MINOR or MAJOR`))
      }
      findPackageSpmPromise({ updateType, debug: options.debug === true, successes: [], warnings: [] })
      .then(parsePackageSpmPromise)
      .then(updatePackageSpmPromise)
      .then(Common.displayMessagesPromise)
      .catch(reject)
    }).on('--help', function () { console.log('\nupdateType should have a case-insensitive value among PATCH, MINOR or MAJOR\n') })
  })
}
