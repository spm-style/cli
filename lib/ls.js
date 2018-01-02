let Fs = require('fs')
let Common = require('./common')
let CONST = require('./const')
let Debug = require('./debug')
let Tree = require('./tree')

/* Checks where package-spm.json file is to define the project's scope */
let findPackageSpmPromise = (ls) => {
  if (ls.debug) { Debug() }
  return new Promise((resolve, reject) => {
    let currentDirectory = Common.getCurrentPath()
    if (currentDirectory.indexOf(CONST.USER_DIRECTORY) === -1) {
      return reject(new Error(CONST.ERROR.OUT_OF_SCOPE))
    }
    while (currentDirectory !== CONST.USER_DIRECTORY) {
      if (Fs.existsSync(`${currentDirectory}${CONST.SEPARATOR}package-spm.json`)) {
        ls.pathPackage = `${currentDirectory}${CONST.SEPARATOR}package-spm.json`
        ls.pathProject = currentDirectory
        return resolve(ls)
      }
      currentDirectory = currentDirectory.substring(0, currentDirectory.lastIndexOf(CONST.SEPARATOR))
    }
    return reject(CONST.ERROR.SPM_PACKAGE_NOT_FOUND)
  })
}

/* parses project's package-spm.json and initiates the tree object */
let initTreeLogicPromise = (ls) => {
  if (ls.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Common.getPackageSpmFilePromise(ls.pathPackage)
    .then(json => {
      ls.current = {}
      ls.current.jsonFile = json
      ls.current.path = ls.pathProject
      ls.current.arborescence = {}
      ls.finalMessage = `this is your project's dependencies tree:`
      return resolve(ls)
    })
    .catch(reject)
  })
}

/* recursively parses a dependency package-spm.json */
let parsePackageSpmRecursivePromise = (ls, table, index = 0, promises = []) => {
  return new Promise((resolve, reject) => {
    if (index >= table.length) {
      return resolve(promises)
    } else {
      let lsBis = Object.assign({}, ls)
      let name = table[index].name
      lsBis.current = {jsonFile: {dependencies: {}}}
      lsBis.current.name = name
      lsBis.current.version = table[index].version
      lsBis.current.path = `${ls.current.path}${CONST.SEPARATOR}spm_modules${CONST.SEPARATOR}${table[index].name}`
      Common.getPackageSpmFilePromise(`${ls.current.path}${CONST.SEPARATOR}package-spm.json`)
      .then(json => {
        lsBis.current.jsonFile = json
        ls.current.arborescence[name] = {
          version: lsBis.current.jsonFile.version,
          instances: ls.current.jsonFile.dependencies[name].instances,
          dependencies: {},
          display: { enable: true }
        }
        lsBis.current.arborescence = ls.current.arborescence[name].dependencies
        parsePackageSpmRecursivePromise(ls, table, index + 1, promises)
        .then(resolve)
        .catch(reject)
      })
      .catch(reject)
    }
  })
}

/* parses a package-spm.json and maps the dependencies  */
let parsePackageSpmPromise = (ls) => {
  if (ls.debug) { Debug() }
  return new Promise((resolve, reject) => {
    let dependencies = Object.keys(ls.current.jsonFile.dependencies || {})
    let index = 0
    for (let key of dependencies) {
      dependencies[index] = {name: key, version: ls.current.jsonFile.dependencies[key]}
      index++
    }
    parsePackageSpmRecursivePromise(ls, dependencies)
    .then(res => { return Promise.all(res) })
    .then(() => { return resolve(ls) })
    .catch(reject)
  })
}

/* Commander for spm ls */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('ls')
    .description(`to display a dependency tree of your project`)
    .option('--debug', 'to display debug logs')
    .action(options => {
      findPackageSpmPromise({ debug: options.debug === true, successes: [], warnings: [] })
      .then(initTreeLogicPromise)
      .then(parsePackageSpmPromise)
      .then(Tree.prepareTreeDisplayPromise)
      .then(Common.displayMessagesPromise)
      .catch(reject)
    }).on('--help', function () { console.log('\nupdateType should have a case-insensitive value among PATCH, MINOR or MAJOR\n') })
  })
}
