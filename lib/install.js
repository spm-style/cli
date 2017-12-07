'use strict'
/** ******** DEPENDENCIES NODE **********/
let Chalk = require('chalk')
let Fs = require('fs')
let Request = require('request')
let Path = require('path')
/** ******** DEPENDENCIES LIB **********/
let Common = require('./common')
let Install = require('./models').Install
let CONST = require('./const')
/** ******** VARIABLE **********/
const DisplayFuncName = false
const debug = false

// let packageOrigin = {
//  'A': '1.0.0',
//  'B': '2.0.0',
//  'C': '3.0.0',
//  'D': '1.0.0',
//  'E': '2.0.0'
// }

// let test = {
//  "E@2.0.0": {
//    name: 'E',
//    version: '2.0.0',
//    dependencies: {}
//  },
//  "C@1.0.0": {
//    name: 'C',
//    version: '1.0.0',
//    dependencies: {}
//  },
//  "C@2.0.0": {
//    name: 'C',
//    version: '2.0.0',
//    dependencies: {}
//  },
//  "C@3.0.0": {
//    name: 'C',
//    version: '3.0.0',
//    dependencies: {}
//  },
//  "D@1.0.0": {
//    name: 'D',
//    version: '1.0.0',
//    dependencies: {
//      'C': {
//        version: '2.0.0'
//      },
//      'B': {
//        version: '2.0.0',
//        instances: {
//          instanceB1: {
//            var1: 'blue',
//            var2: '12px'
//          },
//          instanceB2: {
//            var1: 'red'
//          }
//        }
//      }
//    }
//  },
//  "B@1.0.0": {
//    name: 'B',
//    version: '1.0.0',
//    dependencies: {
//      'C': {
//        version: '1.0.0',
//        instances: {
//          instanceC: {
//            var1: 'blue',
//            var2: '12px'
//          }
//        }
//      },
//      'D': {
//        version: '1.0.0',
//        instances: {
//          instanceD: {
//            var1: 'blue',
//            var2: '12px'
//          }
//        }
//      }
//    }
//  },
//  "B@2.0.0": {
//    name: 'B',
//    version: '2.0.0',
//    dependencies: {
//      'C': {
//        version: '3.0.0',
//        instances: {
//          instanceC1: {
//            var1: 'blue',
//            var2: '12px'
//          },
//          instanceC2: {
//            var1: 'blue',
//            var2: '12px'
//          }
//        }
//      }
//    }
//  },
//  "A@1.0.0": {
//    name: 'A',
//    version: '1.0.0',
//    dependencies: {
//      'B' : {
//        version: '1.0.0',
//        instances: {
//          instanceB: {
//            var1: 'blue',
//            var2: '12px'
//          }
//        }
//      }
//    }
//  }
// };

/* to make modification in the registry, admin rights are needed */
let isSudoForGlobalPromise = (install) => {
  return new Promise((resolve, reject) => {
    if (DisplayFuncName) { console.log('funct° - isSudoForGlobalPromise') }
    if (!install.isGlobal && !install.isRegistry) {
      resolve(install)
    } else {
      Fs.writeFile(`${CONST.SPM_PATH}/test.txt`, (err, data) => {
        if (err) {
          return reject(new Error(CONST.ERROR.NO_SUDO_FOR_GLOBAL))
        } else {
          Fs.unlink(`${CONST.SPM_PATH}/test.txt`, (err) => {
            if (err) {
              reject(err)
            } else {
              resolve(install)
            }
          })
        }
      })
    }
  })
}

/* Checks where package-spm.json file is to define the project's scope */
let findPackageSpmPromise = (install) => {
  return new Promise((resolve, reject) => {
    if (DisplayFuncName) { console.log('funct° - findPackageSpmPromise') }
    let currentDirectory = Common.getCurrentPath()
    if (currentDirectory.indexOf(CONST.USER_DIRECTORY) === -1) {
      return reject(new Error(CONST.ERROR.OUT_OF_SCOPE))
    }
    while (currentDirectory !== CONST.USER_DIRECTORY) {
      if (Fs.existsSync(currentDirectory + '/package-spm.json')) {
        install.pathPackage = currentDirectory + '/package-spm.json'
        install.pathProject = currentDirectory
        return resolve(install)
      }
      currentDirectory = currentDirectory.substring(0, currentDirectory.lastIndexOf('/'))
    }
    if (install.names.length > 0) {
      install.addMessage('warning', CONST.WARNING.NO_PACKAGE_SPM)
      return resolve(install)
    } else {
      return reject(new Error(CONST.ERROR.NO_PACKAGE_SPM))
    }
  })
}

/* creates spm_modules folder at the project's root level */
let createModuleDirectoryPromise = (install) => {
  return new Promise((resolve, reject) => {
    if (DisplayFuncName) { console.log('funct° - createModuleDirectory') }
    if (!Fs.existsSync(CONST.REGISTRY_PATH)) {
      Fs.mkdirSync(CONST.REGISTRY_PATH)
    } else if (!Fs.existsSync(CONST.GLOBAL_PATH)) {
      Fs.mkdirSync(CONST.GLOBAL_PATH)
    }
    install.pathRegistry = CONST.REGISTRY_PATH
    if (install.isRegistry) {
      install.pathModules = install.pathRegistry
      install.current.path = `${Common.getCurrentPath()}/spm_modules`
    } else {
      let currentDirectory = Common.getCurrentPath()
      if (install.pathPackage) {
        install.pathModules = `${install.pathProject}/spm_modules`
        install.current.path = `${install.pathProject}/spm_modules`
      } else {
        let limit = install.pathPackage ? install.pathProject : CONST.USER_DIRECTORY
        while (!Fs.existsSync(`${currentDirectory}/spm_modules`) && currentDirectory !== limit) {
          currentDirectory = currentDirectory.substring(0, currentDirectory.lastIndexOf('/'))
        }
        if (Fs.existsSync(`${currentDirectory}/spm_modules`)) {
          install.addMessage('warning', `install dans le dossier: ${currentDirectory}/spm_modules`)
          install.pathModules = `${currentDirectory}/spm_modules`
          install.current.path = `${currentDirectory}/spm_modules`
        } else {
          install.addMessage('warning', CONST.WARNING.NO_SPM_MODULES)
          install.pathModules = `${Common.getCurrentPath()}/spm_modules`
          install.current.path = `${Common.getCurrentPath()}/spm_modules`
        }
      }
    }
    return resolve(install)
  })
}

/* parses one package's json file to queue up its dependencies */
let getDependenciesInstall = (install) => {
  return new Promise((resolve, reject) => {
    if (DisplayFuncName) { console.log('funct° - getDependenciesInstall', install.pathPackage) }
    if (install.pathPackage) {
      Common.getPackageSpmFilePromise(install.pathPackage)
      .then(json => {
        if (!json) {
          return reject(new Error(CONST.ERROR.SPM_PACKAGE_NOT_FOUND))
        } else {
          if (json.style === 'scss') {
            install.style = 'scss'
            install.warnings.push(`default style has been set as scss according to project's package-spm.json`)
          }
          if (debug) console.log('-- package found --')
          if (install.names.length === 0) {
            if (json.dependencies && typeof json.dependencies === 'object') {
              install.current.jsonFile.dependencies = json.dependencies
              return resolve(install)
            } else { return reject(new Error(CONST.ERROR.NO_PACKAGE_TO_INSTALL)) }
          } else {
            install.addDependenciesNames(install.names)
            return resolve(install)
          }
        }
      })
      .catch(reject)
    } else {
      if (install.names.length === 0) { return reject(new Error(CONST.ERROR.NO_PACKAGE_TO_INSTALL)) } else {
        install.addDependenciesNames(install.names)
        return resolve(install)
      }
    }
  })
}

/* Checks if a package is already in the registry */
let isInRegistry = (install) => {
  let registryPath = `${CONST.REGISTRY_PATH}/${install.current.name}/${install.current.version}`
  if (Common.directoryExists(registryPath)) {
    install.current.target = `${CONST.REGISTRY_PATH}/${install.current.name}/${install.current.version}`
    return true
  }
  if (install.isRegistry) { install.current.target = `${CONST.REGISTRY_PATH}/${install.current.name}/${install.current.version}` }
  return false // add check for package.json + another file at root level
}

/* Checks if a package is already in a project's spm_modules */
let isInProject = (install) => {
  let currentDirectory = install.current.path
  let previousPath
  while (!install.current.secondLevel && Path.relative(currentDirectory, install.pathProject).startsWith('..')) {
    let jsonFile = Common.getPackageSpmFileSync(`${currentDirectory}/spm_modules/${install.current.name}/package-spm.json`)
    if (jsonFile) {
      if (jsonFile.version === install.current.version) {
        install.current.target = `${currentDirectory}/spm_modules/${install.current.name}`
        return true
      } else {
        install.current.bestPath = install.current.bestPath || `${previousPath}/spm_modules/`
      }
    }
    previousPath = currentDirectory
    currentDirectory = currentDirectory.substring(0, currentDirectory.lastIndexOf('/'))
    currentDirectory = currentDirectory.substring(0, currentDirectory.lastIndexOf('/'))
  }
  install.current.bestPath = install.current.bestPath || install.current.secondLevelPath || `${install.pathProject}/spm_modules`
  return false
}

/* requests the spm registry for a package's json file */
let getJsonPackageFromAPIPromise = (install) => {
  return new Promise((resolve, reject) => {
    if (DisplayFuncName) { console.log('funct° - getJsonPackageFromAPIPromise', install.current.name, install.current.version) }
    let url = `http://api.spm-style.com/packages/${install.current.name}`
    if (install.current.version !== 'latest') {
      url += `/${install.current.version}`
    }
    Request(url, (error, response, body) => {
      if (error) {
        if (error.code === 'ECONNREFUSED') { return reject(new Error('Server down check method getJsonApiPromise')) } else { return reject(error) }
      } else {
        install.current.jsonFile = JSON.parse(body)
        install.current.version = install.current.jsonFile.version
        return resolve(install)
      }
    })
  })
}

/* checks if a package is already being installed to avoid duplication */
let alreadyInList = (type, install) => {
  switch (type) {
    case 'download':
      for (let item of install.downloadList) {
        if (item.name === install.current.name) {
          if (item.version === install.current.version) {
            install.current.target = `${item.path}/spm_modules/${install.current.name}`
            install.current.newPromise = item.promise
            return true
          } else if (install.current.bestPath && !Common.unrealRelativePath(install.current.bestPath, install.current.path.split('/').slice(0, item.path.split('/').length + 1).join('/')).startsWith('../../../')) { install.current.bestPath = install.current.path.split('/').slice(0, item.path.split('/').length + 1).join('/') }
        }
      }
      break
    case 'symlink':
      for (let item of install.symlinkList) {
        if (item.name === install.current.name && item.version === install.current.version &&
          (item.path === install.current.path && item.target === install.current.target)) { return true }
      }
      break
    case 'instance':
      for (let item of install.instanceList) {
        if (item.path === `${install.current.target}/dist` && item.name === install.current.instanceName) { return true }
      }
      break
  }
  if (install.current.bestPath) { install.current.target = `${install.current.bestPath}/${install.current.name}` }
  return false
}

/* creates required directories so everything can be asynchronously downloaded */
let createDirectoriesPath = (install) => {
  if (debug) { console.log('<><><> createDirectoriesPath', install.current) }
  try {
    let currentDirectory = install.pathProject
    while (Common.unrealRelativePath(currentDirectory, `${install.current.path}/${install.current.name}`) !== '') {
      if (!install.directoryList.includes(Common.cleanFilePath(currentDirectory)) && !Common.directoryExists(currentDirectory)) {
        install.directoryList.push(Common.cleanFilePath(currentDirectory))
        Fs.mkdirSync(currentDirectory)
      }
      currentDirectory = `${currentDirectory}/${Common.unrealRelativePath(currentDirectory, `${install.current.path}/${install.current.name}`).split('/')[0]}`
    }
    currentDirectory = Common.unrealRelativePath(install.pathProject, install.current.target).startsWith('..') ? CONST.REGISTRY_PATH : install.pathProject
    while (Common.unrealRelativePath(currentDirectory, `${install.current.target}/dist`) !== '') {
      if (!install.directoryList.includes(Common.cleanFilePath(currentDirectory)) && !Common.directoryExists(currentDirectory)) {
        install.directoryList.push(Common.cleanFilePath(currentDirectory))
        Fs.mkdirSync(currentDirectory)
      }
      currentDirectory = `${currentDirectory}/${Common.unrealRelativePath(currentDirectory, `${install.current.target}/dist`).split('/')[0]}`
    }
    return install
  } catch (err) {
    console.log('error in createDirectoriesPath\n', err)
    return null
  }
}

/* writes package-spm.json file */
let WritePackageFilePromie = (current) => {
  return new Promise((resolve, reject) => {
    Fs.writeFile(`${current.target}/package-spm.json`, JSON.stringify(current.jsonFile), err => {
      if (err) { return reject(err) }
      return resolve(current)
    })
  })
}

/* after installation, the default instance must be generated */
let addMainClassesPromise = (current) => {
  return new Promise((resolve, reject) => {
    try {
      if (!Fs.existsSync(`${current.target}/${current.jsonFile.entry}`)) { return reject(new Error(`incorrect entry file in module ${current.name}@${current.version}`)) }
      if (!Common.directoryExists(`${current.target}/dist`)) { Fs.mkdirSync(`${current.target}/dist`) }
      Fs.readFile(`${current.target}/${current.jsonFile.entry}`, 'utf8', (err, data) => {
        if (err) { return reject(err) }
        let i = data.indexOf(`@mixin spm-${current.jsonFile.main}_class(`)
        i = i + `@mixin spm-${current.jsonFile.main}_class(`.length
        let j = data.indexOf(')', i)
        let k
        let parameters = ''
        while ((k = data.indexOf(',', i)) >= 0 && k < j) {
          if (data.substring(i, k).startsWith('$local-')) {
            parameters += `$_${data.substring(i + 7, k)},`
          }
          i = k + 1
        }
        for (let moduleClass of current.jsonFile.classes) {
          parameters += `'${moduleClass.name}',`
        }
        if (parameters.endsWith(',')) { parameters = parameters.slice(0, -1) }
        let input = `@import "../variables-spm.scss";\n@import "../${current.jsonFile.entry}";\n`
        input += `@include spm-${current.name}_class(${parameters});\n`
        Fs.writeFile(`${current.target}/dist/${current.name}.scss`, input, err => {
          if (err) { return reject(err) }
          return resolve(current)
        })
      })
    } catch (err) {
      return reject(err)
    }
  })
}

/* all the magic happens here : checks if a package has to be installed, symlinked and instantiated */
let createListRecursivePromise = (install) => {
  return new Promise((resolve, reject) => {
    install.current.newPromise = new Promise((resolve, reject) => { return resolve() })
    // the dependency already exists or is being installed
    if (!alreadyInList('symlink', install) &&
      ((!install.isLocal && ((!install.isForce && isInRegistry(install)) || alreadyInList('download', install))) ||
      (!install.isRegistry && ((!install.isForce && isInProject(install)) || alreadyInList('download', install))))) {
      if (debug) console.log('=> on symlink dans', install.current.path, 'vers', install.current.target)
      install.current.newPromise = install.current.newPromise.then(() => { return Common.createSymlinkPromise(install.current.name, `${install.current.path}/${install.current.name}`, install.current.target) })
      install.symlinkPromises.push(install.current.newPromise)
      install.symlinkList.push({
        name: install.current.name,
        version: install.current.version,
        path: `${install.current.path}/${install.current.name}`,
        target: install.current.target
      })
    // otherwise, the dependency has to be added to the install list
    } else {
      if (debug) console.log('=> on download in folder', install.current.target)
      install.current.newPromise = Common.downloadModuleSpmPromise(install.current.name, install.current.version, install.current.target)
        .then(() => WritePackageFilePromie(install.current))
        .then(() => addMainClassesPromise(install.current))
        .then(() => {
          if (install.style === 'css') {
            return Common.convertScssToCss(install.current, `${install.current.target}/dist`, install.current.name)
          } else {
            return resolve(install.current)
          }
        })
      install.downloadPromises.push(install.current.newPromise)
      install.downloadList.push({
        name: install.current.name,
        version: install.current.version,
        path: install.current.target,
        promise: install.current.newPromise
      })
      // to improve the lightness of a package, the content isn't installed twice and a symlink is used the second time
      if (Common.unrealRelativePath(`${install.current.path}/${install.current.name}`, install.current.target) !== '') {
        if (debug) console.log('=> on symlink dans', install.current.path, 'vers', `${install.current.target}`)
        install.current.newPromise = install.current.newPromise.then(() => { return Common.createSymlinkPromise(`${install.current.path}/${install.current.name}`, install.current.target) })
        install.symlinkPromises.push(install.current.newPromise)
        install.symlinkList.push({
          name: install.current.name,
          version: install.current.version,
          path: `${install.current.path}/${install.current.name}`,
          target: `${install.current.target}`
        })
      }
    }
    if (!createDirectoriesPath(install)) { return reject(new Error('error creating working directories')) }
    if (debug) console.log('\n\n: == INSTALL AFTER == :\n\n', install.current, '\n\n ================= \n\n')
    if (install.current.instances) {
      for (let instance in install.current.instances) {
        if (install.current.target && !alreadyInList('instance', install) &&
          (install.isForce || !Fs.existsSync(`${install.current.target}/dist/${instance}.scss`))) {
          install.instanceList.push({
            path: `${install.current.target}/dist`,
            name: instance,
            variables: install.current.instances[instance]
          })
          if (!install.directoryList.includes(Common.cleanFilePath(`${install.current.target}/dist`)) && !Common.directoryExists(`${install.current.target}/dist`)) {
            install.directoryList.push(Common.cleanFilePath(`${install.current.target}/dist`))
            Common.createFolderIfUnexistantSync(`${install.current.target}/dist`)
          }
          install.current.newPromise = install.current.newPromise.then(() => { return Common.createInstancePromise(instance, install.current.target, install.current.jsonFile.entry, install.current.instances[instance], install.current.jsonFile.classes) })
          install.instancePromises.push(install.current.newPromise)
        }
      }
    }
    loopForInPromise(install)
    .then(resolve)
    .catch(reject)
  })
}

/* recursively loops inside a packge to install its dependencies, their dependencies, until everything is downloaded */
let loopForInRecursivePromise = (install, table, index = 0, promises = []) => {
  return new Promise((resolve, reject) => {
    if (DisplayFuncName) { console.log('funct° - loopForInRecursivePromise') }
    if (index === table.length) { return resolve(promises) } else {
      let name = table[index].name
      if (debug) { console.log('=====PARENT=====\n', 'for', name, '\n', `${install.current.target || 'project'}`, '\n===============') }
      let installBis = Object.assign({}, install)
      installBis.current = {jsonFile: {dependencies: {}}}
      installBis.current.name = name
      installBis.current.version = install.current.jsonFile.dependencies[name].version
      installBis.current.instances = install.current.jsonFile.dependencies[name].instances
      installBis.current.parentPath = install.current.target || install.pathProject
      installBis.current.path = install.current.parentPath ? `${install.current.target}/spm_modules` : install.current.path
      installBis.current.secondLevelPath = install.current.parentPath ? install.current.secondLevelPath || `${install.current.target}/spm_modules` : null
      getJsonPackageFromAPIPromise(installBis)
      .then(installBis => {
        install.current.arborescence[name] = {
          version: installBis.current.jsonFile.version,
          instances: install.current.parentPath ? install.current.jsonFile.dependencies[name].instances : {},
          dependencies: {}
        }
        installBis.current.arborescence = install.current.arborescence[name].dependencies

        if (debug) { console.log('\n*-* INSTALL BEFORE*-*\n', installBis.current, '\n*****************************\n') }
        promises.push(createListRecursivePromise(installBis))
        loopForInRecursivePromise(install, table, index + 1, promises)
          .then(res => { return resolve(res) })
          .catch(reject)
      })
      .catch(reject)
    }
  })
}

/* ensures all dependencies have been installed and resolves */
let loopForInPromise = (install) => {
  return new Promise((resolve, reject) => {
    if (DisplayFuncName) { console.log('funct° - loopForInPromise') }
    let dependencies = Object.keys(install.current.jsonFile.dependencies)
    let index = 0
    for (let key of dependencies) {
      dependencies[index] = Object.assign(install.current.jsonFile.dependencies[key], {name: key})
      index++
    }
    loopForInRecursivePromise(install, dependencies)
    .then(res => { console.log(res); return Promise.all(res) })
    .then(() => { return resolve(install) })
    .catch(reject)
  })
}

/* waits until all downloads, symlinks and instances have been created and resolves */
let CheckAllActionsPromise = (install) => {
  return new Promise((resolve, reject) => {
    if (DisplayFuncName) { console.log('funct° - CheckAllActionsPromise') }
    if (debug) { console.log('\n--\ndownloadListPromise', {downloadList: install.downloadList, symlinkList: install.symlinkList, instanceList: install.instanceList, directoryList: install.directoryList}) }
    Promise.all(install.downloadPromises.concat(install.symlinkPromises).concat(install.instancePromises))
    .then(() => { return resolve(install) })
    .catch(reject)
  })
}

/* Graphical function to print the install arborescence */
let printArborescence = (install, settings) => {
  settings.maxLen += 6
  let final = ''
  let indicator = 0
  for (let line of settings.results) {
    final = `${final}\n${line.text}`

    if (line.instances && Object.keys(line.instances).length) {
      let first = true
      for (let instance in line.instances) {
        if (first) {
          let index = 0
          while (line.len + 1 < settings.maxLen) {
            index++
            final += Chalk.hex('#464646')((first && index > 2) ? '.' : ' ')
            line.len++
          }
        } else {
          if (indicator + 1 < settings.results.length && settings.results[indicator + 1].level) { final += `\n${Array(settings.results[indicator + 1].level * 3).join(' ')}${Chalk.hex('#F6EAB7')('|')}${Array(settings.maxLen - settings.results[indicator + 1].level * 3).join(' ')}` } else { final += `\n${Array(settings.maxLen).join(' ')}` }
        }
        final += `  ${Chalk.hex('#00BBFF')(instance)}`
        first = false
      }
      if (indicator + 1 < settings.results.length && settings.results[indicator + 1].level) { final += `\n${Array(settings.results[indicator + 1].level * 3).join(' ')}${Chalk.hex('#F6EAB7')('|')}` }
    }
    indicator++
  }
  final += '\n'
  install.successes.push(`The following has been installed in your project:\n€{final}`)
}

/* prepares the string displaying the installation arborescence by recursively browsing in the install tree */
let printArborescenceRecursive = (install, arborescence, settings, bases = [''], level = 0, res = '') => {
  let round = 1
  let tmpRes
  let result = res
  for (let key of Object.keys(arborescence)) {
    if (!level) {
      tmpRes = `${key}@${arborescence[key].version}`
      settings.maxLen = tmpRes.length > settings.maxLen ? tmpRes.length : settings.maxLen
      settings.results.push({text: Chalk.hex('#40E0D0')(tmpRes), len: tmpRes.length})
    } else {
      let display = ''
      for (let i = 0; i < bases.length; i++) {
        display += bases[i]
      }
      tmpRes = `${display}  |_ ${key}@${arborescence[key].version}`
      settings.maxLen = tmpRes.length > settings.maxLen ? tmpRes.length : settings.maxLen
      settings.results.push({
        text: Chalk.hex('#F6EAB7')(display + '  |_ ') + Chalk.hex('#E78644')(`${key}@${arborescence[key].version}`),
        len: tmpRes.length,
        level,
        instances: arborescence[key].instances
      })
    }
    if (arborescence[key] != null) {
      let newBase = bases.slice()
      let newLevel = level + 1
      if (level) {
        round < Object.keys(arborescence).length ? newBase.push('  |') : newBase.push('   ')
      }
      printArborescenceRecursive(install, arborescence[key].dependencies, settings, newBase, newLevel, result)
    }
    round++
  }
  if (!level) { printArborescence(install, settings) }
  return round
}

/* launches the arborescence functions */
let printArborescencePromise = (install) => {
  return new Promise((resolve, reject) => {
    if (DisplayFuncName) { console.log('funct° - printArborescencePromise') }
    let arborescenceSettings = {
      maxLen: 0,
      results: [],
      level: 0
    }
    try {
      printArborescenceRecursive(install, install.current.arborescence, arborescenceSettings)
    } catch (err) {
      reject(err)
    }
    return resolve(install)
  })
}

/* Adds packages in package-spm.json if flag --save */
let savePackagesPromise = (install) => {
  return new Promise((resolve, reject) => {
    if (!install.isSave) {
      return resolve(install)
    }
    for (let key in install.current.arborescence) {
      if (install.current.jsonFile.dependencies[key]) {
        install.warnings.push(`${install.current.jsonFile.dependencies[key]} already in project's dependencies - solve manually`)
      } else {
        install.current.jsonFile.dependencies[key] = { version: install.current.arborescence[key].version }
        install.successes.push(`${install.current.jsonFile.dependencies[key]}@${install.current.jsonFile.dependencies[key].version} added in project's dependencies`)
      }
    }
    Common.writeContent(JSON.stringify(install.current.jsonFile, null, '  ') + '\n', install.pathPackage, '', install)
    .then(resolve)
    .catch(reject)
  })
}

/* Commander for spm install */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('install')
    .alias('i')
    .description('installs the module or one of its components/templates/elements')
    .arguments('[names...]')
    .option('-l, --local', 'to copy it in your local spm_modules')
    .option('-r, --registry', 'to copy it in your /usr/lib/spm_modules')
    .option('-s, --save', 'to add to dependencies in your local package.json')
    .option('-d, --dev', 'to add to dev dependencies')
    .option('-p, --prod', 'to only install dependencies')
    .option('--scss', `if you use scss preprocessing language, css by default`)
    .option('-f, --force', 'to force the install of all modules, including modules already installed')
    .option('--sudo', 'user sudo')
    .action((names, options) => {
      let install = new Install(options, names)
      isSudoForGlobalPromise(install)
      .then(findPackageSpmPromise)
      .then(createModuleDirectoryPromise)
      .then(getDependenciesInstall)
      .then(loopForInPromise)
      .then(CheckAllActionsPromise)
      .then(printArborescencePromise)
      .then(savePackagesPromise)
      .then(Common.displayMessagesPromise)
      .then(resolve)
      .catch(reject)
    }).on('--help', function () {
      console.log('  Examples:')
    })
  })
}
