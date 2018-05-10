let Fs = require('fs')
let Path = require('path')
let Chalk = require('chalk')
let Request = require('request')
let Js = require('../lib/js')
let Css = require('../lib/css')
let Html = require('../lib/html')
let Models = require('../lib/models')
let CONST = require('../../../lib/const')
let Debug = require('../../../lib/debug')
let Common = require('../../../lib/common')
let Spinner = require('../../user/lib/spinner')
let Authentify = require('../../user/lib/authentify')
let Preferences = require('preferences')

/* Detect if in the scope of a project */
let testProjectScopePromise = (publish) => {
  if (publish.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Common.findProjectJsonPromise(publish.initialPath)
    .then(path => {
      publish.projectPath = path
      return resolve(publish)
    })
    .catch(reject)
  })
}

/* search down for targeted module-spm.json from project folder or HOME */
let downRecursiveModuleNameSearchPromise = (publish, currentDirectory) => {
  if (publish.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Fs.lstat(currentDirectory, (err, stats) => {
      if (err) { return reject(err) }
      if (!stats.isDirectory()) { return resolve(null) } else {
        Common.getJsonFilePromise(Path.join(currentDirectory, CONST.MODULE_JSON_NAME))
        .then(json => {
          if (!json || (publish.name && json.name !== publish.name)) {
            Fs.readdir(currentDirectory, (err, files) => {
              if (err) { return reject(err) }
              let promises = []
              for (let file of files) {
                promises.push(downRecursiveModuleNameSearchPromise(publish, Path.join(currentDirectory, file)))
              }
              Promise.all(promises)
              .then(resPublishes => {
                for (let resPublish of resPublishes) {
                  if (resPublish) { return resolve(resPublish) }
                }
                return resolve(null)
              })
              .catch(reject)
            })
          } else {
            publish.json = json
            publish.path = currentDirectory
            return resolve(publish)
          }
        })
        .catch(reject)
      }
    })
  })
}

/* search up for targeted module-spm.json until project folder or HOME */
let upRecursiveModuleNameSearchPromise = (publish, currentDirectory) => {
  if (publish.debug) { Debug() }
  return new Promise((resolve, reject) => {
    if (!currentDirectory) {
      return reject(new Error(CONST.ERROR.SPM_MODULE_NOT_FOUND))
    } else if (currentDirectory.indexOf(publish.projectPath || CONST.USER_DIRECTORY) === -1) {
      downRecursiveModuleNameSearchPromise(publish, publish.projectPath || CONST.USER_DIRECTORY)
      .then(res => {
        if (!res) { return reject(new Error(`${publish.name} not found in your context`)) }
        return resolve(res)
      })
      .catch(reject)
    } else {
      Common.getJsonFilePromise(Path.join(currentDirectory, CONST.MODULE_JSON_NAME))
      .then(json => {
        if (!json || (publish.name && json.name !== publish.name)) {
          upRecursiveModuleNameSearchPromise(publish, Path.dirname(currentDirectory))
          .then(resolve)
          .catch(reject)
        } else {
          publish.path = currentDirectory
          publish.json = json
          return resolve(publish)
        }
      })
      .catch(reject)
    }
  })
}

/* parse project json file */
let getModuleJsonPromise = (publish) => {
  if (publish.debug) { Debug() }
  return new Promise((resolve, reject) => {
    if (!publish.name) {
      Common.findModuleJsonPromise(publish.initialPath, publish.projectPath || CONST.USER_DIRECTORY)
      .then(path => {
        if (!path) { return reject(new Error(CONST.ERROR.SPM_MODULE_NOT_FOUND)) }
        publish.path = path
        Common.getJsonFilePromise(Path.join(path, CONST.MODULE_JSON_NAME))
        .then(json => {
          publish.json = json
          return resolve(publish)
        })
        .catch(reject)
      })
      .catch(reject)
    } else {
      upRecursiveModuleNameSearchPromise(publish, publish.initialPath)
      .then(resolve)
      .catch(reject)
    }
  })
}

/* Checks the module parameters and suggests 'spm module edit' if not found */
let checkModuleJsonPromise = (publish) => {
  if (publish.debug) { Debug() }
  return new Promise((resolve, reject) => {
    const keyMaps = {
      name: {
        regex: /^[a-zA-Z0-9_]{2,}$/,
        message: `name should be longer than 2 characters (value spm_modules forbidden) - use 'spm module edit --name <name>'`
      },
      version: {
        regex: publish.version ? false : /^[0-9]+[.][0-9]+[.][0-9]+$/,
        message: `Incorrect version in package-spm.json - use 'spm module edit --version <version>'`
      },
      style: {
        regex: /^(?:css|scss)$/,
        message: `your style should be css or scss - use 'spm module edit --style <style>'`
      },
      mainClass: {
        regex: /^[a-zA-Z0-9_]{2,}$/,
        message: `main class should be longer than 2 characters - use 'spm module edit --main-class <mainClass>'`
      },
      description: {
        regex: false,
        message: `missing description - use 'spm module edit --description  <description>'`
      },
      category: {
        regex: false,
        message: `missing category - use 'spm module edit --category <category>'`
      },
      license: {
        regex: false,
        message: `missing license - use 'spm module edit --license <license>'`
      }
    }
    const arrays = ['keywords', 'contributors', 'classes']
    for (let key in keyMaps) {
      if (publish.json[key] === undefined || publish.json[key] === null || (keyMaps[key].regex && !keyMaps[key].regex.test(publish.json[key]))) { return reject(new Error(keyMaps[key].message)) }
    }
    if (!publish.json.responsive || !publish.json.responsive.length || !Common.checkCorrectResponsiveness(publish.json.responsive)) {
      return reject(new Error(`incorrect responsive devices - use "spm module edit --responsive <devices>"\nwith one or several devices among "watch", "mobile", "phablet", "tablet", "laptop", "screenXl"`))
    }
    for (let moduleArray of arrays) {
      if (!publish.json[moduleArray] || !(publish.json[moduleArray] instanceof Array)) {
        return reject(new Error(`incorrect ${moduleArray} - use 'spm module edit --${moduleArray} <${moduleArray}>'`))
      }
    }
    publish.name = publish.json.name
    publish.version = publish.version || publish.json.version
    return resolve(publish)
  })
}

/* adds in ignoreList specific files from .spmignore file */
let parseIgnoreFilePromise = (publish) => {
  if (publish.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Fs.readFile(Path.join(publish.path, '.spmignore'), 'utf8', (err, data) => {
      if (err && err.code !== 'ENOENT') { return reject(err) } else if (err) { return resolve([]) }
      let ignores = []
      for (let ignore of data.split('\n')) { if (ignore.length) { ignores.push(ignore) } }
      return resolve(ignores)
    })
  })
}

/* adds basic ignored files (spm_modules excluded) to .spmignore fileContent */
let processIgnoredFilesPromise = (publish) => {
  return new Promise((resolve, reject) => {
    parseIgnoreFilePromise(publish)
    .then(ignoredFiles => {
      publish.ignores = ['.tmp_spm', '.gitignore', '.npmignore', 'module-spm.json', `${publish.json.files.index}`].concat(ignoredFiles)
      return resolve(publish)
    })
    .catch(reject)
  })
}

/* creates a mapping of all classes related to dependencies object in package.json */
let mapDependenciesClassesPromise = (publish) => {
  if (publish.debug) { Debug() }
  return new Promise((resolve, reject) => {
    publish.dependenciesClassesMapping = {}
    let promises = []
    let promiseList = []
    publish.dependencies = publish.json.dependencies || {}
    for (let dependency in publish.json.dependencies) {
      promises.push(Common.getJsonFilePromise(Path.join(publish.path, 'spm_modules', dependency, 'module-spm.json')))
      promiseList.push(dependency)
    }
    Promise.all(promises)
    .then(results => {
      for (let i = 0; i < results.length; i++) {
        if (results[i] === null) {
          delete publish.dependencies[promiseList[i]]
          publish.warnings.push(`dependency ${promiseList[i]} has no module-spm.json - reinstall using --force`)
        } else {
          if (!results[i].classes) { return reject(new Error(`dependency ${promiseList[i]} has no class defined - reinstall using --force`)) }
          for (let item of results[i].classes) {
            publish.dependenciesClassesMapping[item.name] = { module: promiseList[i], instance: promiseList[i] }
          }
          for (let instance in publish.dependencies[promiseList[i]].instances) {
            for (let instanceClass in publish.dependencies[promiseList[i]].instances[instance].classes) {
              publish.dependenciesClassesMapping[publish.dependencies[promiseList[i]].instances[instance].classes[instanceClass]] = { module: promiseList[i], instance: instance }
            }
          }
        }
      }
      return resolve(publish)
    })
    .catch(reject)
  })
}

/* initiates the copy folder and the copy functions */
let publicationCopyPromise = (publish) => {
  if (publish.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Common.FolderCopyPromise(publish.path, Path.join(publish.path, '.tmp_spm'), file => {
      for (let ignoredFile of publish.ignores) { if (Path.relative(file, Path.join(publish.path, ignoredFile)) === '') { return false } }
      return true
    })
    .then(() => {
      return resolve(publish)
    })
    .catch(reject)
  })
}

/* prepares publish workspace */
let prepareWorkspacePromise = (publish) => {
  return new Promise((resolve, reject) => {
    cleanWorkspacePromise(publish)
    .then(() => {
      Fs.mkdir(Path.join(publish.path, '.tmp_spm'), err => {
        if (err && err.code !== 'EEXIST') {
          return reject(err)
        } else if (err) { return reject(new Error(`${Path.join(publish.path, '.tmp_spm')} forbidden name in publication - please delete before publication`)) }
        Fs.mkdir(Path.join(publish.path, '.tmp_spm', '.sass_spm'), err => {
          if (err && err.code !== 'EEXIST') {
            return reject(err)
          } else if (err) { return reject(new Error(`${Path.join(publish.path, '.tmp_spm')} forbidden name in publication - please delete before publication`)) }
          processIgnoredFilesPromise(publish)
          .then(mapDependenciesClassesPromise)
          .then(publicationCopyPromise)
          .then(resolve)
          .catch(reject)
        })
      })
    })
    .catch(reject)
  })
}

/* Checks module's files */
let checkModuleFilesPromise = (publish) => {
  if (publish.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Html.fileCheckerPromise(publish)
    .then(Css.fileCheckerPromise)
    .then(Js.fileCheckerPromise)
    .then(() => resolve(publish))
    .catch(reject)
  })
}

/* verifies the publication has no missing information  */
let checkPublicationContent = (publish) => {
  if (publish.debug) { Debug() }
  return new Promise((resolve, reject) => {
    if (publish.json.mainClass.includes('-')) { return reject(new Error(`main class cannot include any '-' character`)) }
    publish.apiPackage = {
      name: publish.name,
      version: publish.version,
      type: publish.json.type,
      style: publish.json.style,
      mainClass: publish.json.mainClass,
      classes: publish.json.classes,
      sandbox: {defaultClasses: publish.json.sandbox && publish.json.sandbox.defaultClasses ? publish.json.sandbox.defaultClasses : []},
      description: publish.json.description,
      ssEntry: publish.json.files.style,
      jsEntry: publish.json.files.script,
      dependencies: publish.json.dependencies,
      keywords: publish.json.keywords,
      license: publish.json.license,
      dom: {type: 'custom', value: publish.dom},
      responsiveness: publish.json.responsive,
      category: publish.json.category,
      jsImports: publish.jsImports,
      public: publish.public
    }
    if (publish.json.readme) { publish.apiPackage.readme = publish.json.readme }
    if (publish.json.repository) { publish.apiPackage.repository = publish.json.repository }
    let incorrectKeys = []
    for (let key in publish.apiPackage) {
      if (publish.apiPackage[key] === undefined && !['responsiveness'].includes(key)) {
        incorrectKeys.push(key)
      }
    }
    if (publish.apiPackage.responsiveness && !publish.apiPackage.responsiveness.length) { incorrectKeys.push('responsive') }
    if (incorrectKeys.length) { return reject(new Error(`missing information: ${incorrectKeys.join(', ')} - please use spm module edit to update ${incorrectKeys.length > 1 ? 'them' : 'it'}`)) }
    return resolve(publish)
  })
}

/* Displays the publication and asks the publisher for final confirmation */
let confirmationPublishPromise = (publish) => {
  if (publish.debug) { Debug() }
  return new Promise((resolve, reject) => {
    checkPublicationContent(publish)
    .then(() => {
      if (publish.force) { return resolve(publish) }
      console.log(`You are about to publish the module ${publish.name}@${publish.version}\nif you have the rights to publish, your contribution will be added in spm registry`)
      Common.promptConfirmation(publish, true, 'Do you confirm this ')
      .then(resolve)
      .catch(reject)
    })
    .catch(reject)
  })
}

/* Auth module - publication requires a spm account and authorization on existing package */
let promptUserPromise = (publish) => {
  if (publish.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Authentify.getSpmAPIToken('login')
    .then(token => {
      // checking classes' names
      publish.login = new Preferences(CONST.PREFERENCES).login
      let incorrectClasses = []
      let moduleName = publish.name.includes('_') ? publish.name : `${publish.login}_${publish.name}`
      for (let moduleClass of publish.json.classes) {
        if (moduleClass.includes('_') && moduleClass !== moduleName && !moduleClass.startsWith(`${moduleName}-`)) {
          incorrectClasses.push(moduleClass)
        }
      }
      if (incorrectClasses.length) { return reject(new Error(`incorrect classes found : ${incorrectClasses.join(', ')} - cannot contain underscore (_)`)) }
      publish.token = token
      return resolve(publish)
    })
    .catch(err => reject(new Error(`${err} - please use spm user register if it's your first visit`)))
  })
}

/* create a tmp tgz file for the future read stream */
let createTgzPromise = (publish) => {
  if (publish.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Common.deleteFolderRecursivePromise(Path.join(publish.path, '.tmp_spm', 'spm_modules'), true)
    .then(() => {
      Fs.mkdir(Path.join(publish.path, '.tmp_spm_publish'), err => {
        if (err && err.code !== 'EEXIST') { return reject(err) }
        Common.tgzFilePromise(Path.join(publish.path, '.tmp_spm'), Path.join(publish.path, '.tmp_spm_publish', `${publish.name}.tgz`),
          (path, stat) => ![Path.join('.tmp_spm', 'spm_modules')].includes(path))
        .then(() => {
          return resolve(publish)
        })
        .catch(reject)
      })
    })
    .catch(reject)
  })
}

/* Prepares payload and sends content to spm registry - handles api replies */
let sendPublicationToRegistryPromise = (publish) => {
  if (publish.debug) { Debug() }
  return new Promise((resolve, reject) => {
    let formData = { package: JSON.stringify(publish.apiPackage) }
    if (publish.debug) console.log('package', formData.package)
    formData.module = Fs.createReadStream(Path.join(publish.path, '.tmp_spm_publish', `${publish.name}.tgz`))
    let spinner = new Spinner('sending to registry...', 'monkey')
    spinner.start()
    Request.put({
      url: CONST.PUBLISH_URL,
      headers: {
        'Authorization': `bearer ${publish.token}`
      },
      formData: formData
    }, function (error, response, body) {
      if (error) { return reject(spinner.errorStop(`there was an error sending data to spm registry - please try again later or contact our support\n${error}`)) }
      try {
        let res = JSON.parse(body)
        if (Math.floor(res.statusCode / 100) >= 4) {
          if (res.message.includes('incorrect user information')) {
            return reject(spinner.errorStop(`your session has timed out, please login again with "spm user login"`))
          } else {
            return reject(spinner.errorStop(res.message))
          }
        } else {
          spinner.successStop(`module publication correctly processed by spm registry`)
          if (res.name !== publish.name) {
            publish.warnings.push(`your package ${publish.name} has been renamed to ${res.name} by spm registry`)
          }
          publish.successes.push(`${res.name}@${res.version} has been successfully created`)
          return resolve(publish)
        }
      } catch (e) { return reject(e) }
    })
    .on('error', err => {
      return reject(spinner.errorStop(`there was an error sending data to spm registry - please try again later or contact our support\n${err}`))
    })
  })
}

/* cleans publish workspace */
let cleanWorkspacePromise = (publish) => {
  if (publish.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Common.deleteFolderRecursivePromise(Path.join(publish.path || publish.initialPath, '.tmp_spm'), true)
    .then(() => {
      Common.deleteFolderRecursivePromise(Path.join(publish.path || publish.initialPath, '.tmp_spm_publish'), true)
      .then(() => {
        return resolve(publish)
      })
      .catch(reject)
    })
    .catch(reject)
  })
}

/* PROJECT PUBLISH : to send your module to spm registry and factory */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('publish')
    .alias('p')
    .description(`to send your module to spm registry and factory`)
    .arguments('[moduleName]')
    .option('-a, --access [access]', 'to specify the authorization level to your module', /^(public|private)$/i, 'public')
    .option('-v, --version <version>', `to specify the module's version`)
    .option('--html-checker', `to force the tool to fix conflicts between html files containing your main class`)
    .option('--no-js', `to indicate your module doesn't contain any javascript`)
    .option('--debug', 'to display debug logs')
    .option('--force', 'to publish without confirmation if information are correct')
    .option('--private', 'to publish a private module')
    .action((moduleName, options) => {
      if (moduleName && moduleName.includes('@')) {
        if (!/^[0-9]+[.][0-9]+[.][0-9]+$/.test(moduleName.substring(moduleName.indexOf('@') + 1))) {
          Program.on('--help', () => { console.log(Chalk.hex(CONST.WARNING_COLOR)('please enter a valid version number (x.x.x)')) })
          Program.help()
        } else {
          options.version = moduleName.substring(moduleName.indexOf('@') + 1)
          moduleName = moduleName.substring(0, moduleName.indexOf('@'))
        }
      }
      let publish = new Models.Publish(moduleName, options)
      testProjectScopePromise(publish)
      .then(getModuleJsonPromise)
      .then(checkModuleJsonPromise)
      .then(prepareWorkspacePromise)
      .then(checkModuleFilesPromise)
      .then(confirmationPublishPromise)
      .then(promptUserPromise)
      .then(createTgzPromise)
      .then(sendPublicationToRegistryPromise)
      .then(cleanWorkspacePromise)
      .then(Common.displayMessagesPromise)
      .then(resolve)
      .catch(err => {
        cleanWorkspacePromise(publish)
        .then(() => {
          if (publish.path) {
            if (err.message) {
              err.message = err.message.replace(Path.join(publish.path, '.tmp_spm', '.sass_spm', 'result.css'), 'resulting of spm checks').replace(Path.join(publish.path, '.tmp_spm'), publish.path)
            } else {
              err = err.replace(Path.join(publish.path, '.tmp_spm', '.sass_spm', 'result.css'), 'resulting of spm checks').replace(Path.join(publish.path, '.tmp_spm'), publish.path)
            }
          }
          return reject(err)
        })
        .catch(reject)
      })
    })
  })
}
