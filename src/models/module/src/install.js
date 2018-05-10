let Fs = require('fs')
let Path = require('path')
let Request = require('request')
let Preferences = require('preferences')
let Js = require('../lib/js')
let Css = require('../lib/css')
let Html = require('../lib/html')
let Tree = require('../lib/tree')
let Models = require('../lib/models')
let Debug = require('../../../lib/debug')
let CONST = require('../../../lib/const')
let Common = require('../../../lib/common')

/* checks for project and module context */
let defineInstallPathsPromise = (install) => {
  if (install.debug) { Debug() }
  return new Promise((resolve, reject) => {
    install.pathInitial = Common.getCurrentPath()
    Common.findProjectJsonPromise(install.pathInitial)
    .then(path => {
      install.pathProject = path
      Common.findModuleJsonPromise(install.pathInitial)
      .then(path => {
        install.pathModule = path
        if (!install.pathProject && !install.pathModule) {
          if (!install.names.length) {
            return reject(new Error(`no module or project detected in your current path - no dependency to be installed`))
          }
          install.warnings.push('no module or project detected - install in current path')
        }
        return resolve(install)
      })
      .catch(reject)
    })
    .catch(reject)
  })
}

/* creates registry and spm_modules folder at the action's root level */
let createModuleDirectoryPromise = (install) => {
  if (install.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Fs.mkdir(CONST.SPM_DIRECTORY, err => {
      if (err && err.code !== 'EEXIST') { return reject(err) }
      Fs.mkdir(CONST.REGISTRY_PATH, err => {
        if (err && err.code !== 'EEXIST') { return reject(err) }
        install.pathRegistry = CONST.REGISTRY_PATH
        install.pathFinal = install.pathModule || install.pathProject || install.pathInitial
        install.pathJson = install.pathModule ? Path.join(install.pathModule, CONST.MODULE_JSON_NAME) : install.pathProject ? Path.join(install.pathProject, CONST.PROJECT_JSON_NAME) : null
        if (!install.pathJson && !install.jsStandard) { return reject(new Error(`please precise if your install is modular or legacy with --js-standard options`)) }
        install.pathModules = install.isRegistry ? install.pathRegistry : Path.join(install.pathFinal, 'spm_modules')
        return resolve(install)
      })
    })
  })
}

/* parses one required module's json file to queue up its dependencies */
let getDependenciesInstallPromise = (install) => {
  if (install.debug) { Debug() }
  return new Promise((resolve, reject) => {
    if (install.pathJson) {
      Common.getJsonFilePromise(`${install.pathJson}`)
      .then(json => {
        if (!json) {
          return reject(new Error(`${install.pathModule ? 'module' : 'project'} detected but no json file in ${install.pathModule || install.pathProject}`))
        } else {
          try {
            install.jsonFile = JSON.parse(JSON.stringify(json))
            install.files = install.jsonFile.files
            install.jsStandard = install.jsonFile.jsStandard
            if (!install.jsStandard) {
              return reject(new Error(`missing js standard in ${install.pathJson} - update with spm module edit --js-standard <standard>, using modular or legacy`))
            }
            if (!install.style) {
              install.style = json.style
              install.warnings.push(`default style has been set to ${json.style}`)
            }
            if (install.names.length === 0) {
              if (install.isSave) { install.warnings.push(`Are you trying to save what's already save ? inc3p7i0n a13rt ;-)`) }
              if (json.dependencies && typeof json.dependencies === 'object' && Object.keys(json.dependencies).length) {
                install.dependencies = json.dependencies
                return resolve(install)
              } else { return reject(new Error(`no dependency to install from ${install.pathJson}`)) }
            } else {
              install.addDependenciesNames(install.names)
              return resolve(install)
            }
          } catch (e) { return reject(e) }
        }
      })
      .catch(reject)
    } else {
      install.addDependenciesNames(install.names)
      return resolve(install)
    }
  })
}

/* requests the spm registry for a package's json file */
let getJsonPackageFromAPIPromise = (install) => {
  if (install.debug) { Debug() }
  return new Promise((resolve, reject) => {
    let url = `${CONST.PACKAGE_URL}/install/${install.name}`
    if (install.version && install.version !== true) { url += `?version=${install.version}` }
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
          return reject(new Error(`API error for package ${install.name}: ${body.message}`))
        } else {
          install.jsonFile = body
          install.dependencies = {}
          for (let dependency of body.dependencies) {
            install.dependencies[dependency.name] = dependency.version
          }
          install.jsonFile.dependencies = install.dependencies // added
          install.files = body.files
          install.version = body.version
          return resolve(install)
        }
      } catch (e) { return reject(e) }
    })
  })
}

/* checks if a package is already being installed to avoid duplication */
let alreadyInList = (type, install) => {
  switch (type) {
    case 'download':
      for (let item of install.downloadList) {
        if (item.name === install.name) {
          if (item.version === install.version) {
            install.target = `${item.path}` // /spm_modules/${install.name}
            install.newPromise = item.promise
            return true
          } else if (install.bestPath && !Common.unrealRelativePath(install.bestPath, install.path.split('/').slice(0, item.path.split('/').length + 1).join('/')).startsWith('../../../')) {
            install.bestPath = install.path.split('/').slice(0, item.path.split('/').length + 1).join('/')
          }
        }
      }
      break
    case 'symlink':
      for (let item of install.symlinkList) {
        if (item.name === install.name && item.version === install.version &&
          (item.path === install.path && item.target === install.target)) { return true }
      }
      break
  }
  if (install.bestPath) { install.target = Path.join(install.bestPath, install.name) }
  return false
}

/* Checks if a module is already in the registry PROMISE */
let isInRegistryPromise = (install) => {
  return new Promise((resolve, reject) => {
    let registryPath = Path.join(CONST.REGISTRY_PATH, install.name, install.version)
    Fs.access(registryPath, err => {
      if (err && err.code !== 'ENOENT') {
        return reject(err)
      } else if (err) {
        if (install.isRegistry) { install.target = Path.join(CONST.REGISTRY_PATH, install.name, install.version) }
        return resolve(false) // add check for package.json + another file at root level
      } else {
        install.target = Path.join(CONST.REGISTRY_PATH, install.name, install.version)
        return resolve(true)
      }
    })
  })
}

/* recursive check of a module's version */
let isInLocalRecursivePromise = (install, currentDirectory = install.path, previousPath = null) => {
  return new Promise((resolve, reject) => {
    if (!install.secondLevel && Path.relative(currentDirectory, install.pathFinal).startsWith('..')) {
      Common.getJsonFilePromise(Path.join(currentDirectory, CONST.MODULE_JSON_NAME))
      .then(json => {
        if (json) {
          if (json.version === install.version) {
            install.target = `${currentDirectory}`
            return resolve(true)
          } else if (previousPath) {
            install.bestPath = install.bestPath || Path.join(previousPath, 'spm_modules')
          } else {
            install.enable = false
            install.warnings.push(`${install.name} already in project with version ${json.version} - you can replace it using install --force`)
            return resolve(true)
          }
        }
        previousPath = currentDirectory
        currentDirectory = Path.dirname(Path.dirname(currentDirectory))
        isInLocalRecursivePromise(install, currentDirectory, previousPath)
        .then(resolve)
        .catch(reject)
      })
      .catch(reject)
    } else {
      install.bestPath = install.bestPath || Path.join(install.pathFinal, 'spm_modules')
      return resolve(false)
    }
  })
}

/* Checks if a module is already in an action's spm_modules PROMISE */
let isInLocalPromise = (install) => {
  return new Promise((resolve, reject) => {
    isInLocalRecursivePromise(install)
    .then(resolve)
    .catch(reject)
  })
}

/* checks if a module is already in the spm's local registry */
let checkInRegistryPromise = (install) => {
  return new Promise((resolve, reject) => {
    if (!install.isForce) {
      isInRegistryPromise(install)
      .then(val => {
        if (val) { return resolve(true) } else { return resolve(alreadyInList('download', install)) }
      })
      .catch(reject)
    } else { return resolve(alreadyInList('download', install)) }
  })
}

/* checks if a module is already in the current module or project as a dependency */
let checkInLocalPromise = (install) => {
  return new Promise((resolve, reject) => {
    if (!install.isForce) {
      isInLocalPromise(install)
      .then(val => {
        if (val) { return resolve(true) } else { return resolve(alreadyInList('download', install)) }
      })
      .catch(reject)
    } else { return resolve(alreadyInList('download', install)) }
  })
}

/* defines what has to be done with the module */
let defineActionToPerformPromise = (install) => {
  if (install.debug) { Debug() }
  return new Promise((resolve, reject) => {
    if (!alreadyInList('symlink', install)) {
      if (!install.isLocal) {
        checkInRegistryPromise(install)
        .then(val => {
          if (val) { return resolve(true) } else {
            if (!install.isRegistry) {
              checkInLocalPromise(install)
              .then(resolve)
              .catch(reject)
            } else { return resolve(false) }
          }
        })
        .catch(reject)
      } else if (!install.isRegistry) {
        checkInLocalPromise(install)
        .then(resolve)
        .catch(reject)
      } else { return resolve(false) }
    } else { return resolve(false) }
  })
}

/* installs and/or links the dependency */
let installDependencyPromise = (install) => {
  if (install.debug) { console.log('\n** install', install.name, install.path) }
  return new Promise((resolve, reject) => {
    getJsonPackageFromAPIPromise(install)
    .then(defineActionToPerformPromise)
    .then(alreadyHandled => {
      if (alreadyHandled) {
        if (install.debug) { console.log('>> already found', install.target) }
        install.added = false
        // if the dependency is already correctly located
        if (Path.relative(`${install.path}`, install.target) === '') {
          // if the 1st level dependency already exists
          if (Path.relative(install.path, Path.join(install.pathModules, install.name)) === '') {
            install.warnings.push(`package ${install.name}@${install.version} already in project - use --force for reinstallation`)
          }
          return resolve(install)
        } else {
          // create a symlink
          if (install.debug) { console.log('>> ln -s (1)', Path.join(install.path, install.name), 'to', install.target) }
          Common.createSymlinkPromise(Path.join(install.path, install.name), install.target)
          .then(() => resolve(install))
          .catch(reject)
        }
      } else {
        install.target = install.target || install.path || install.pathFinal
        install.added = true
        install.stats.addedNumber++
        install.downloadList.push({ name: install.name, version: install.version, path: install.target })
        if (install.debug) { console.log('>> downloading:', `${install.name}@${install.version}`, 'in', install.target) }
        Common.downloadModuleSpmPromise(install.name, install.version, install.target)
        .then(() => Common.writeContent(JSON.stringify(install.jsonFile, null, '  ') + '\n', Path.join(install.target, CONST.MODULE_JSON_NAME), '', install))
        .then(() => Css.defineParametersOrderPromise(install, install))
        .then(() => installDependenciesPromise(install, false))
        .then(() => {
          return new Promise((resolve, reject) => {
            if (Path.relative(install.path, install.target) !== '') {
              if (install.debug) { console.log('>> ln -s (2)', `${install.path}`, 'to', install.target) }
              Common.createSymlinkPromise(install.path, install.target)
              .then(() => resolve(install))
              .catch(reject)
            } else { return resolve(install) }
          })
        })
        .then(() => {
          if (install.jsStandard === 'legacy') {
            Js.splitsLegacyFilePromise(install)
            .then(resolve)
            .catch(reject)
          } else {
            Js.processModularDependenciesPromise(install)
            .then(() => resolve(install))
            .catch(reject)
          }
        })
        .catch(reject)
      }
    })
    .catch(reject)
  })
}

/* ensures all dependencies have been installed and resolves */
let installDependenciesPromise = (install, topDependency = true) => {
  if (install.debug) { Debug() }
  return new Promise((resolve, reject) => {
    let promises = []
    if (Object.keys(install.dependencies).length) {
      Fs.mkdir(Path.join(install.path || install.pathFinal, 'spm_modules'), err => {
        if (err && err.code !== 'EEXIST') { return reject(err) }
        if (install.debug) { console.log('>> mkdir', `${install.path || Path.join(install.pathFinal, 'spm_modules')}`) }
        for (let dependency in install.dependencies) {
          let installBis = Object.assign({}, install)
          installBis.name = dependency
          installBis.lowerName = Common.firstLetterLowerCase(dependency)
          installBis.upperName = Common.firstLetterUpperCase(dependency)
          installBis.version = install.dependencies[dependency]
          installBis.path = `${install.path || Path.join(install.pathFinal, 'spm_modules', installBis.name)}`
          installBis.jsContent = {}
          installBis.children = []
          promises.push(installDependencyPromise(installBis))
        }
        Promise.all(promises)
        .then(dependencies => {
          install.children = dependencies
          if (topDependency) { return resolve(install) } else {
            if (install.jsStandard === 'modular') {
              Js.processSubInstancesModularPromise(install)
              .then(() => resolve(install))
              .catch(reject)
            } else { return resolve(install) }
          }
        })
        .catch(reject)
      })
    } else {
      return resolve(install)
    }
  })
}

/* generates spm_instances folder and files */
let initInstancesPromise = (install) => {
  if (install.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Fs.mkdir(Path.join(install.pathFinal, CONST.INSTANCE_FOLDER), err => {
      if (err && err.code !== 'EEXIST') { return reject(err) }
      let promises = []
      promises.push(Css.processInstancesPromise(install))
      promises.push(Js.processInstancesPromise(install))
      promises.push(Html.processInstancesPromise(install))
      Promise.all(promises)
      .then(() => resolve(install))
      .catch(reject)
    })
  })
}

/* converts added files in css if needed */
let cssFilesConvertionPromise = (install) => {
  if (install.debug) { Debug() }
  return new Promise((resolve, reject) => {
    if (install.style === 'scss' || !install.children.length) { return resolve(install) }
    let promises = []
    for (let dependency of install.children) {
      if (dependency.added) { promises.push(cssFilesConvertionPromise(dependency)) }
    }
    Promise.all(promises)
    .then(() => {
      if (install.debug) { console.log('>> (css) convert', `${Path.join(install.path || install.pathFinal, CONST.INSTANCE_FOLDER, CONST.INSTANCE_FOLDER + '.scss')} to .${CONST.INSTANCE_FOLDER}.css`) }
      Css.convertScssToCss(Path.join(install.path || install.pathFinal, CONST.INSTANCE_FOLDER, `${CONST.INSTANCE_FOLDER}.scss`), Path.join(install.path || install.pathFinal, CONST.INSTANCE_FOLDER, `.${CONST.INSTANCE_FOLDER}.css`))
      .then(() => resolve(install))
      .catch(reject)
    })
    .catch(reject)
  })
}

/* saves new dependencies in module's json file */
let processSavedModulesPromise = (install) => {
  if (install.debug) { Debug() }
  return new Promise((resolve, reject) => {
    if (!install.isSave) { return resolve(install) }
    for (let child of install.children) {
      install.jsonFile.dependencies[child.name] = child.version
    }
    let dependencies = []
    for (let dependency in install.jsonFile.dependencies) {
      dependencies.push(dependency)
    }
    dependencies.sort()
    let newDependencies = {}
    for (let dependency of dependencies) {
      newDependencies[dependency] = install.jsonFile.dependencies[dependency]
    }
    install.jsonFile.dependencies = newDependencies
    Fs.writeFile(Path.join(install.pathFinal, CONST.MODULE_JSON_NAME), JSON.stringify(install.jsonFile, null, '  '), err => {
      if (err) { return reject(err) }
      install.successes.push(`${CONST.MODULE_JSON_NAME} updated with installed dependencies`)
      return resolve(install)
    })
  })
}

/* PROJECT INSTALL : to use a specific module as a dependency */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('install')
    .alias('i')
    .description(`to use a specific module as a dependency`)
    .arguments('[names...]')
    .option('-l, --local', 'to copy it in your local spm_modules')
    .option('-r, --registry', 'to copy it in your ~/.spm/registry')
    .option('-s, --save', 'to add to dependencies in your local package.json')
    .option('-d, --dev', 'to add to dev dependencies')
    .option('-p, --prod', 'to only install dependencies')
    .option('--style <style>', `if you use scss preprocessing language, css by default`, /^(css|scss)$/i)
    .option('--js-standard <standard>', `to precise the jsStandard if no package-json is found`, /^(modular|legacy)$/i)
    .option('-f, --force', 'to force the install of all modules, including modules already installed')
    .option('--debug', 'to display debug logs')
    .action((names, options) => {
      let install = new Models.Install(names, options)
      defineInstallPathsPromise(install)
      .then(createModuleDirectoryPromise)
      .then(getDependenciesInstallPromise)
      .then(installDependenciesPromise)
      .then(initInstancesPromise)
      .then(cssFilesConvertionPromise)
      .then(processSavedModulesPromise)
      .then(Tree.prepareTreeDisplayPromise)
      .then(Common.displayMessagesPromise)
      .then(resolve)
      .catch(reject)
    })
  })
}
