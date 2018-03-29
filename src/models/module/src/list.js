let Fs = require('fs')
let Tree = require('../lib/tree')
let Common = require('../../../lib/common')
let CONST = require('../../../lib/const')
let Debug = require('../../../lib/debug')

/* Checks where json file is to define the module's or project's scope */
let findJsonFilePromise = (list) => {
  if (list.debug) { Debug() }
  return new Promise((resolve, reject) => {
    list.pathInitial = Common.getCurrentPath()
    Common.findProjectJsonPromise(list.pathInitial)
    .then(path => {
      list.pathProject = path
      Common.findModuleJsonPromise(list.pathInitial)
      .then(path => {
        list.pathModule = path
        list.pathFinal = list.pathModule || list.pathProject || list.pathInitial
        list.pathModules = `${list.pathFinal}/spm_modules`
        if (!list.pathProject && !list.pathModule) {
          list.warnings.push('no module or project detected - list in current path')
          Common.findModulesPromise(list.pathInitial)
          .then(path => {
            list.pathModules = path
            if (!path) { return reject(new Error(`no installed module - no instance to list`)) }
            return resolve(list)
          })
        } else {
          list.pathPackage = `${list.pathFinal}/${list.pathModule ? CONST.MODULE_JSON_NAME : CONST.PROJECT_JSON_NAME}`
          return resolve(list)
        }
      })
      .catch(reject)
    })
    .catch(reject)
  })
}

/* parses project's package-spm.json and initiates the tree object */
let initTreeLogicPromise = (list) => {
  if (list.debug) { Debug() }
  return new Promise((resolve, reject) => {
    list.path = list.pathFinal
    list.children = []
    list.finalMessage = `this is your project's dependencies tree:`
    if (list.saved) {
      Common.getJsonFilePromise(list.pathPackage)
      .then(json => {
        list.jsonFile = json
        return resolve(list)
      })
      .catch(reject)
    } else {
      list.jsonFile = { dependencies: {} }
      Fs.readdir(`${list.path}/spm_modules`, (err, files) => {
        if (err && err.code === 'ENOENT') { return reject(err) } else if (err) { return reject(new Error(`no dependency found`)) }
        let promises = []
        for (let file of files) {
          promises.push(Common.getJsonFilePromise(`${list.path}/spm_modules/${file}/${CONST.MODULE_JSON_NAME}`))
        }
        Promise.all(promises)
        .then(dependencies => {
          for (let dependency of dependencies) {
            if (dependency) { list.jsonFile.dependencies[dependency.name] = dependency.version }
          }
          return resolve(list)
        })
        .catch(reject)
      })
    }
  })
}

/* recursively parses a dependency package-spm.json */
let parseModulesRecursivePromise = (list) => {
  if (list.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Common.getJsonFilePromise(`${list.path}/${CONST.MODULE_JSON_NAME}`)
    .then(json => {
      list.jsonFile = json
      if (list.top) { return resolve(list) }
      parseModulesPromise(list)
      .then(resolve)
      .catch(reject)
    })
    .catch(reject)
  })
}

/* parses a package-spm.json and maps the dependencies  */
let parseModulesPromise = (list) => {
  if (list.debug) { Debug(list) }
  return new Promise((resolve, reject) => {
    if (!list.jsonFile) { return resolve(list) }
    let dependencies = Object.keys(list.jsonFile.dependencies || {})
    let promises = []
    for (let key of dependencies) {
      let listBis = Object.assign({}, list)
      listBis.children = []
      listBis.name = key
      listBis.added = true
      listBis.version = list.jsonFile.dependencies[key]
      listBis.path = `${list.path}/spm_modules/${key}`
      promises.push(parseModulesRecursivePromise(listBis))
    }
    Promise.all(promises)
    .then(dependencies => {
      list.children = dependencies
      return resolve(list)
    })
    .catch(reject)
  })
}

/* MODULE LIST : to display the list of dependencies used in your module */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('list')
    .alias('ls')
    .description(`to display the dependencies used in your module or project`)
    .option('--saved-only', `to display only saved `)
    .option('--top-only', `to display the dependencies available in the root level spm_modules/ folder`)
    .option('--debug', 'to display debug logs')
    .action(options => {
      findJsonFilePromise({ top: options.topOnly, saved: options.savedOnly === true, debug: options.debug === true, successes: [], warnings: [] })
      .then(initTreeLogicPromise)
      .then(parseModulesPromise)
      .then(Tree.prepareTreeDisplayPromise)
      .then(Common.displayMessagesPromise)
      .catch(reject)
    }).on('--help', function () { console.log('\nupdateType should have a case-insensitive value among PATCH, MINOR or MAJOR\n') })
  })
}
