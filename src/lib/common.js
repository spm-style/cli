let Prompt = require('inquirer').prompt
let Chalk = require('chalk')
let Fs = require('fs')
let Path = require('path')
let Tar = require('tar')
let Request = require('request')
let CONST = require('./const')
let Ncp = require('ncp')
let Preferences = require('preferences')

/* checks if a responsiveness array is correct */
let checkCorrectResponsiveness = (responsiveness) => {
  const devices = ['watch', 'mobile', 'phablet', 'tablet', 'laptop', 'screenXl']
  for (let item of responsiveness) {
    if (!devices.includes(item)) { return false }
  }
  return true
}

/* transforms a string into an array of results */
let optionList = (str) => {
  let res = []
  if (str && typeof str === 'string') {
    for (let item of str.split(',')) {
      for (let subItem of item.split(' ')) {
        if (subItem.length) { res.push(subItem) }
      }
    }
  }
  return res
}

/* returns process' path */
let getCurrentPath = () => {
  return process.cwd()
}

/* promise-based file writer using node FS */
let writeFilePromise = (target, data, conf = {}, force = false) => {
  return new Promise((resolve, reject) => {
    Fs.writeFile(target, data, {
      flag: force ? 'w' : 'wx',
      encoding: 'utf8'
    }, err => {
      if (err && err.code !== 'EEXIST') {
        return reject(err)
      } else if (err && conf.warnings) {
        conf.warnings.push(`file ${target} already exists - not overriden`)
      } else if (conf.successes) { conf.successes.push(`file ${target} successfully created`) }
      return resolve(target)
    })
  })
}

/* find json file and resolves its path - null if not found */
let findJsonPromise = (currentDirectory, file, stopDirectory) => {
  return new Promise((resolve, reject) => {
    if (!currentDirectory || currentDirectory.indexOf(stopDirectory) === -1) { return resolve(null) }
    Fs.access(Path.join(currentDirectory, file), Fs.constants.F_OK, err => {
      if (err) {
        findJsonPromise(Path.dirname(currentDirectory), file, stopDirectory).then(resolve).catch(reject)
      } else {
        return resolve(currentDirectory)
      }
    })
  })
}
/* finds project-spm.json and resolves its path - null if not found */
let findProjectJsonPromise = (currentDirectory, stopDirectory = CONST.USER_DIRECTORY) => {
  return new Promise((resolve, reject) => {
    findJsonPromise(currentDirectory, CONST.PROJECT_JSON_NAME, stopDirectory)
    .then(resolve)
    .catch(reject)
  })
}

/* finds module-spm.json and resolves its path - null if not found */
let findModuleJsonPromise = (currentDirectory, stopDirectory = CONST.USER_DIRECTORY) => {
  return new Promise((resolve, reject) => {
    findJsonPromise(currentDirectory, CONST.MODULE_JSON_NAME, stopDirectory)
    .then(resolve)
    .catch(reject)
  })
}

/* finds spm_modules and resolves its path - null if not found */
let findModulesPromise = (currentDirectory, stopDirectory = CONST.USER_DIRECTORY) => {
  return new Promise((resolve, reject) => {
    if (!currentDirectory || currentDirectory.index(stopDirectory) === -1) { return resolve(null) }
    Fs.stat(`${currentDirectory}/spm_modules`, (err, stats) => {
      if (err && err !== 'ENOENT') { return reject(err) } else if (err) {
        findModulesPromise(Path.dirname(currentDirectory), stopDirectory)
        .then(resolve)
        .catch(reject)
      } else { return resolve(`${currentDirectory}/spm_modules`) }
    })
  })
}

/* reads json file and converts string to json object */
let getJsonFilePromise = (filePath) => { // old name getPackageSpmFilePromise
  return new Promise((resolve, reject) => {
    Fs.readFile(filePath, (err, data) => {
      if (err && err.code !== 'ENOENT') { return reject(err) } else if (err) { return resolve(null) }
      try {
        return resolve(JSON.parse(data))
      } catch (e) { return reject(e) }
    })
  })
}

/* downloads packages from spm registry */
let downloadModuleSpmPromise = (name, version, targetPath, source = false) => {
  return new Promise((resolve, reject) => {
    if (!Path.isAbsolute(targetPath)) { targetPath = Path.join(__dirname, targetPath) }
    Fs.mkdir(targetPath, err => {
      if (err && err.code !== 'EEXIST') { return reject(err) }
      Request.get({
        url: `${CONST.PUBLISH_URL}/${name}/${version}${source ? '/clone' : ''}`,
        headers: {
          'Authorization': `bearer ${new Preferences(CONST.PREFERENCES).token}`
        }
      })
      .on('response', res => {
        if (res.statusCode >= 400) { return reject(new Error(`${res.statusMessage || res.message} - CDN`)) }
      })
      .on('error', reject)
      .pipe(
        Tar.x({
          strip: 1,
          C: targetPath
        })
        .on('error', reject)
        .on('finish', () => {
          return resolve({name: name, version: version, status: 'success'})
        })
      )
    })
  })
}

/* to remove neutral characters for selector parsing in css */
let cleanValue = (str) => {
  if (!str || !str.length) { return str }
  let i = 0
  let j = str.length - 1
  while (str[i] === ' ' || str[i] === '\t' || str[i] === '\n') { i++ }
  while (str[j] === ' ' || str[i] === '\t' || str[i] === '\n' || str[j] === ';') { j-- }
  return str.substring(i, j + 1)
}

/* parses a string to associate its original type */
let variableType = (str) => {
  if (str) {
    if (str === 'true' || str === 'false') {
      return 'boolean'
    }
    let dot = 0
    for (let i = 0; i < str.length; i++) {
      if (str[i] === '.') {
        dot++
        if (dot > 1) {
          return 'string'
        }
      } else if (str[i] < '0' || str[i] > '9') {
        return 'string'
      }
    }
    return 'number'
  }
  return undefined
}

/* Ensures a specific folder exists */
let createFolderIfUnexistantSync = (filePath) => {
  try {
    Fs.access(filePath, Fs.constants.F_OK, err => {
      if (err) {
        Fs.mkdirSync(filePath, err => {
          if (err) { return null } else {
            return filePath
          }
        })
      } else {
        return filePath
      }
    })
  } catch (err) {
    return null
  }
}

/* generic prompter to confirm information */
let promptConfirmation = (res, defaultValue = false, text = 'Is this ok ?') => {
  return new Promise((resolve, reject) => {
    Prompt([{
      type: 'confirm',
      name: 'confirmation',
      default: defaultValue,
      message: text
    }])
    .then(answer => {
      if (!answer.confirmation) { return reject(new Error('Aborted by user')) }
      return resolve(res)
    })
    .catch(reject)
  })
}

/* promise-based function to write content using node FS */
let writeContent = (res, name, path = '', returnValue = false) => {
  return new Promise((resolve, reject) => {
    Fs.writeFile(path + name, res, 'utf8', err => {
      if (err && err.code !== 'EEXIST') { return reject(err) }
      return resolve(returnValue || path + name)
    })
  })
}

/* to detect the directory where the process is executed */
let getCurrentDirectory = () => {
  return Path.basename(process.cwd())
}

/* Ensures a folder and its content is deleted - mimics rm -r */
let deleteFolderRecursivePromise = (path, ignoreENOENT = false) => {
  return new Promise((resolve, reject) => {
    Fs.lstat(path, (err, stats) => {
      if (err && (!ignoreENOENT || err.code !== 'ENOENT')) { return reject(err) } else if (err && err.code === 'ENOENT') { return resolve(path) }
      if (stats.isDirectory()) {
        Fs.readdir(path, (err, files) => {
          if (err && (!ignoreENOENT || err.code !== 'ENOENT')) { return reject(err) } else if (err && err.code === 'ENOENT') { return resolve(path) }
          let promises = []
          for (let file of files) { promises.push(deleteFolderRecursivePromise(Path.join(path, file), ignoreENOENT)) }
          Promise.all(promises)
          .then(() => {
            Fs.rmdir(path, err => {
              if (err && (!ignoreENOENT || err.code !== 'ENOENT')) { return reject(err) } else if (err && err.code === 'ENOENT') { return resolve(path) }
              return resolve(path)
            })
          })
          .catch(reject)
        })
      } else {
        Fs.unlink(path, err => {
          if (err && (!ignoreENOENT || err.code !== 'ENOENT')) { return reject(err) } else if (err && err.code === 'ENOENT') { return resolve(path) }
          return resolve(path)
        })
      }
    })
  })
}

/* Deletes everything in a folder but the folder itself */
let deleteContentFolderRecursive = (path, callback, firstRecursive = true) => {
  if (Fs.existsSync(path)) {
    for (let file of Fs.readdirSync(path)) {
      let currentPath = Path.join(path, file)
      if (Fs.lstatSync(currentPath).isDirectory()) {
        deleteContentFolderRecursive(currentPath, callback, false)
      } else {
        Fs.unlinkSync(currentPath)
      }
    }
    if (firstRecursive) {
      return callback()
    } else {
      Fs.rmdirSync(path)
    }
  }
}

/* checks if a directory exists and manages errors as false answer */
let directoryExists = (filePath) => {
  try {
    return Fs.existsSync(filePath) && Fs.statSync(filePath).isDirectory()
  } catch (err) {
    return false
  }
}

/* file checker as a promise */
let fileExistsPromise = (filePath) => {
  return new Promise((resolve, reject) => {
    Fs.access(filePath, Fs.constants.F_OK, err => {
      if (err && err.code !== 'ENOENT') { return reject(err) } else if (err) { return resolve(false) }
      return resolve(true)
    })
  })
}

/* Path.relative cannot compute relative path between unexisting files */
let unrealRelativePath = (file1, file2) => {
  if (!file1 || !file2) { return file2 }
  let tab1 = file1.split(CONST.SEPARATOR)
  let tab2 = file2.split(CONST.SEPARATOR)
  for (let i = 0; i < tab1.length || i < tab2.length; i++) {
    if (i < tab1.length) {
      if (tab1[i] === '.') {
        tab1.splice(i, 1)
        i--
      } else if (tab1[i] === '..') {
        tab1.splice(i - 1, 2)
      }
    }
    if (i < tab2.length) {
      if (tab2[i] === '.') {
        tab2.splice(i, 1)
        i--
      } else if (tab2[i] === '..') {
        tab2.splice(i - 1, 2)
      }
    }
  }
  let i = 0
  while (i < tab1.length && i < tab2.length && tab1[i] === tab2[i]) { i++ }
  let j = i
  let res = ''
  while (i < tab1.length && tab1[i] !== '') {
    res = res + `..${CONST.SEPARATOR}`
    i++
  }
  while (j < tab2.length) {
    res = `${res}${tab2[j]}${CONST.SEPARATOR}`
    j++
  }
  while (res.endsWith(CONST.SEPARATOR)) { res = res.slice(0, -1) }
  return res
}

/* removes '.' and '..' from input path */
let cleanFilePath = (filePath) => {
  return Path.normalize(filePath)
}

/* transforms a string with capital first letter and other lowercase letters */
let firstLetterCapitalize = (str) => {
  if (str) {
    let res = `${str[0].toUpperCase()}`
    for (let i = 1; i < str.length; i++) {
      res = `${res}${str[i].toLowerCase()}`
    }
    return res
  } else {
    return null
  }
}

/* mixin name normalizer */
let defineMixinName = (filePath) => {
  let table = filePath.split('/')
  let res = ''
  if (table.length < 1) {
    // how to deal with this impossible case ?
  } else {
    for (let i = 0; i < table.length; i++) {
      res = `${res}${firstLetterCapitalize(table[i])}`
    }
  }
  return res.substring(0, res.length - 5)
}

/* generates scss instance file */
let createScssInstancePromise = (install) => {
  return new Promise((resolve, reject) => {
    Fs.readFile(Path.join(install.pathFinal, CONST.INSTANCE_FOLDER, `${CONST.INSTANCE_FOLDER}.scss`), 'utf8', (err, data) => {
      if (err && err.code !== 'ENOENT') { return reject(err) } else if (err) {
        // create the file from scratch
        let importData = ''
        let includeData = ''
        for (let module of install.finalInstances) {
          module.variableMap = {}
          module.classParameters = []
          for (let moduleClass of module.json.classes) {
            module.classParameters.push(moduleClass.name)
            for (let variableItem of moduleClass.variables) { module.variableMap[variableItem.name] = variableItem.value }
          }
          let ssParameters = ''
          let classParameters = ''
          for (let param of module.ssParameters) { ssParameters += `${module.variableMap[param]},` }
          for (let moduleClass of module.classParameters) { classParameters += `'${moduleClass}',` }
          classParameters = classParameters.slice(0, -1)
          importData += `@import '../spm_modules/${module.name}/${module.json.files.style}';\n`
          includeData += `@include ${module.name}(${ssParameters}${classParameters});\n`
        }
        data = `${importData}\n${includeData}`
      } else {
        // add in folder the correct instances
      }
      Fs.writeFile(Path.join(install.pathFinal, CONST.INSTANCE_FOLDER, `${CONST.INSTANCE_FOLDER}.scss`), data, err => {
        if (err) { return reject(err) }
        return resolve(install)
      })
    })
  })
}

/* generates scss instance input and file */
let createInstancePromise = (install) => {
  return new Promise((resolve, reject) => {
    let promises = []
    promises.push(createScssInstancePromise(install))
    // if (install.jsStandard === 'modular') { promises.push(createModularInstancePromise(install, install.current.modularContent)) }
    Promise.all(promises)
    .then(() => resolve(install))
    .catch(reject)
  })
}

/* parses and import line to a path for css */
let importToFile = (str, sub = false) => {
  let importAcceptedChars = [`'`, `"`]
  if (str.length > 2) {
    for (let acceptedChar of importAcceptedChars) {
      let split = str.split(acceptedChar)
      if (str.startsWith(acceptedChar) && split.length === 3 && split[0] === '' && split[2] === '') { return split[1] }
    }
    if (str.startsWith('url(') && str.indexOf(')') > 5 && !sub) { return importToFile(str.substring(4, str.indexOf(')')), true) }
  }
  return null
}

/* detects all css imports in a string */
let findAllImportInString = (str) => {
  let importedFiles = []
  let i, j
  let indexStart = 0
  let resultFile
  while ((i = str.indexOf('@import ', indexStart)) >= 0) {
    if ((j = str.indexOf(';', i)) >= 0) {
      if ((resultFile = importToFile(str.substring(i + 8, j)))) {
        importedFiles.push(resultFile)
      } else {
        // ERROR management
      }
    }
    indexStart = i + 8
  }
  return importedFiles
}

/* updates files where the package is used */
let updateFilePromise = (item, use) => {
  return new Promise((resolve, reject) => {
    Fs.readFile(item, 'utf8', (err, data) => {
      if (err) { return reject(new Error(`issue reading the file ${item}`)) }
      let startIndex = 0
      let i
      let detectedImports = findAllImportInString(data)
      while ((i = data.indexOf('@import ', startIndex)) >= 0) {
        startIndex = data.indexOf(';', i)
        if (startIndex < -1) {
          // ERROR MESSAGE INCORRECT IMPORT IN FILE ITEM
          data = null
          break
        }
      }
      if (!data) {
        data = ''
      }
      let useBis = Object.assign({}, use)
      try { useBis.pathInstances = JSON.parse(JSON.stringify(use.pathInstances)) } catch (e) { return reject(e) }
      for (let pathInstance in useBis.pathInstances) {
        let toBeAdded = true
        for (let importedFile of detectedImports) {
          if (Path.relative(Path.join(Path.dirname(item), importedFile), pathInstance) === '') {
            delete useBis.pathInstances[pathInstance]
            useBis.warnings.push(`${use.pathInstances[pathInstance].instance} already imported in file ${use.usePathes[item]}`)
            toBeAdded = false
            break
          }
        }
        if (toBeAdded) {
          if (!startIndex) {
            data = `@import '${Path.relative(item, pathInstance).substring(1)}';\n${data}`
          } else {
            data = `${data.substring(0, startIndex + 1)}\n@import '${Path.relative(item, pathInstance).substring(1)}';${data.substring(startIndex + 1)}`
          }
        }
      }
      writeFilePromise(item, data)
      .then(() => { return resolve({target: item, instances: useBis.pathInstances}) })
      .catch(reject)
    })
  })
}

/* updates all files where the package or instances are added */
let updateUsedFilesPromise = (use) => {
  return new Promise((resolve, reject) => {
    let promises = []
    for (let item in use.usePathes) {
      if (item.endsWith('.css') || item.endsWith('.scss')) {
        if (Fs.existsSync(item)) {
          promises.push(updateFilePromise(item, use))
        } else {
          use.warnings.push(`${use.usePathes[item]} not found`)
        }
      } else { use.warnings.push(`${use.usePathes[item]} not scss or css file`) }
    }
    Promise.all(promises)
    .then(targets => {
      if (use.isSave) { use.pathSavedInstances = use.pathInstances }
      use.pathInstances = {}
      for (let target of targets) {
        use.pathInstances = Object.assign(use.pathInstances, target.instances)
      }
      if (Object.keys(use.pathInstances).length) {
        let msg = `The following instance${Object.keys(use.pathInstances).length === 1 ? ' has' : 's have'} been added:`
        for (let item in use.pathInstances) {
          msg += `\n> ${Chalk.hex(CONST.INSTANCE_COLOR)(use.pathInstances[item].instance)} of module ${Chalk.hex(CONST.MODULE_COLOR)(use.pathInstances[item].module)}`
        }
        msg += `\nin file${targets.length === 1 ? '' : 's'}`
        for (let target of targets) {
          msg += `\n> ${Chalk.hex(CONST.PROJECT_COLOR)(use.usePathes[target.target])}`
        }
        use.successes.push(msg)
      }
      return resolve(use)
    })
    .catch(reject)
  })
}

/* Generic message displayer with ERROR / WARNING / SUCCESS messages (in this order) */
let displayMessagesPromise = (item) => {
  return new Promise((resolve, reject) => {
    if (item.warnings.length) { console.log('') }
    for (let msg of item.warnings) {
      console.log(`${Chalk.hex(CONST.WARNING_COLOR)('WARNING')}: ${msg}`)
    }
    if (item.successes.length) { console.log('') }
    for (let msg of item.successes) {
      console.log(`${Chalk.hex(CONST.SUCCESS_COLOR)('SUCCESS')}: ${msg}`)
    }
    if (item.warnings.length || item.successes.length) { console.log('') }
    return resolve(item)
  })
}

/* plug and play wrapper to compress a file in a tgz format */
let tgzFilePromise = (input, output, filter = null) => {
  return new Promise((resolve, reject) => {
    let inputFolder, inputFile
    input = Path.normalize(input)
    output = Path.normalize(output)
    inputFolder = Path.dirname(input)
    inputFile = Path.basename(input)
    let options = {
      file: output,
      C: inputFolder,
      gzip: true
    }
    if (filter) { options.filter = filter }
    Tar.c(options, [inputFile]).then(() => {
      return resolve(output)
    })
    .catch(reject)
  })
}

/* copy using tar over node Fs */
let FolderCopyPromise = (input, output, filter = null) => {
  return new Promise((resolve, reject) => {
    let options = {}
    if (filter) { options.filter = filter }
    Ncp(input, output, options, err => {
      if (err) { return reject(err) }
      return resolve(output)
    })
  })
}

/* ensures all directory leading to symlink exist */
let createSymlinkLevelsPromise = (src, dest, level = 0) => {
  return new Promise((resolve, reject) => {
    if (src.split('/').length <= level + 2) {
      Fs.symlink(dest, src, err => {
        if (err) { return reject(err) }
        return resolve(src)
      })
    } else {
      Fs.mkdir(src.split('/').slice(0, 2 - src.split('/').length + level).join('/'), err => {
        if (err && err.code !== 'EEXIST') { return reject(err) }
        createSymlinkLevelsPromise(src, dest, level + 1)
        .then(resolve)
        .catch(reject)
      })
    }
  })
}

/* creates a symlink from src to dest */
let createSymlinkPromise = (src, dest, forceDirectory = true) => {
  return new Promise((resolve, reject) => {
    if (forceDirectory) {
      createSymlinkLevelsPromise(src, dest)
      .then(resolve)
      .catch(reject)
    } else {
      Fs.symlink(dest, src, err => {
        if (err) { return reject(err) }
        return resolve(src)
      })
    }
  })
}

/* Promise-based readdir */
let readdirPromise = (dirPath) => {
  return new Promise((resolve, reject) => {
    Fs.readdir(dirPath, (err, files) => {
      if (err) { return reject(err) }
      return resolve(files)
    })
  })
}

/* returns the highest version between two versions of type x.x.x */
let isHigherVersion = (oldVersion, newVersion) => {
  if (!oldVersion) { return newVersion }
  let tab1 = oldVersion.split('.')
  let tab2 = newVersion.split('.')
  let i = 0
  while (i < 3) {
    if (tab1[i] > tab2[i]) {
      return oldVersion
    } else if (tab1[i] < tab2[i]) { return newVersion }
    i++
  }
  return oldVersion
}

/* current modules in item.moduleChoices | add latest version for each module in registry */
let updateRegistryModulesPromise = (item) => {
  return new Promise((resolve, reject) => {
    readdirPromise(item.pathModules)
    .then(files1 => {
      item.moduleChoices = []
      for (let file of files1) {
        if (Fs.statSync(Path.join(item.pathModules, file)).isDirectory()) { item.moduleChoices.push(file) }
      }
      readdirPromise(CONST.REGISTRY_PATH)
      .then(files => {
        let promises = []
        for (let index = 0; index < files.length; index++) {
          if (item.moduleChoices.includes(files[index])) {
            files.splice(index, 1)
            index--
          } else {
            promises.push(readdirPromise(Path.join(CONST.REGISTRY_PATH, files[index])))
          }
        }
        Promise.all(promises)
        .then(versionsArray => {
          let registryModulesToInstall = []
          for (let i = 0; i < files.length; i++) {
            let finalVersion = null
            for (let version of versionsArray[i]) { finalVersion = isHigherVersion(finalVersion, version) }
            if (!finalVersion) { return reject(new Error(`issue with module ${files[i]}`)) }
            item.moduleChoices.push(files[i])
            registryModulesToInstall.push(createSymlinkPromise(Path.join(item.pathModules, files[i]), Path.join(CONST.REGISTRY_PATH, files[i], finalVersion), false))
          }
          Promise.all(registryModulesToInstall)
          .then(() => { return resolve(item) })
          .catch(reject)
        })
        .catch(reject)
      })
      .catch(reject)
    })
    .catch(reject)
  })
}

/* modify only first letter with upper case */
let firstLetterUpperCase = (str) => {
  return str && str.length ? `${str[0].toUpperCase()}${str.substring(1)}` : str
}

/* modify only first letter with lower case */
let firstLetterLowerCase = (str) => {
  return str && str.length ? `${str[0].toLowerCase()}${str.substring(1)}` : str
}

module.exports = {
  getCurrentPath,
  getJsonFilePromise,
  promptConfirmation,
  writeContent,
  getCurrentDirectory,
  deleteFolderRecursivePromise,
  unrealRelativePath,
  cleanFilePath,
  deleteContentFolderRecursive,
  directoryExists,
  createFolderIfUnexistantSync,
  downloadModuleSpmPromise,
  cleanValue,
  createInstancePromise,
  writeFilePromise,
  variableType,
  defineMixinName,
  findAllImportInString,
  updateUsedFilesPromise,
  displayMessagesPromise,
  tgzFilePromise,
  createSymlinkPromise,
  updateRegistryModulesPromise,
  findProjectJsonPromise,
  findModuleJsonPromise,
  optionList,
  fileExistsPromise,
  checkCorrectResponsiveness,
  FolderCopyPromise,
  findModulesPromise,
  firstLetterUpperCase,
  firstLetterLowerCase
}
