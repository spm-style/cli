let Inquirer = require('inquirer')
let Chalk = require('chalk')
let Fs = require('fs')
let Path = require('path')
let Tar = require('tar')
let Request = require('request')
let CONST = require('./const')
let Sass = require('node-sass')
const SCSS_IGNORED_CHARS = [' ', '\n', '\t']

/* returns process' path */
let getCurrentPath = () => {
  return process.cwd()
}

/* reads packge-spm.json file and converts string to json object */
let getPackageSpmFilePromise = (filePath) => {
  return new Promise((resolve, reject) => {
    Fs.readFile(filePath, (err, data) => {
      if (err && err.code !== 'ENOENT') { return reject(err) } else if (err) { return resolve(null) }
      return resolve(JSON.parse(data))
    })
  })
}

let getPackageSpmFileSync = (filePath) => {
  if (Fs.existsSync(filePath)) {
    return JSON.parse(Fs.readFileSync(filePath))
  } else { return null }
}

/* promise-based file writer using node FS */
let writeFilePromise = (target, data) => {
  return new Promise((resolve, reject) => {
    Fs.writeFile(target, data, err => {
      if (err) { return reject(err) }
      return resolve(target)
    })
  })
}

/* downloads packages from spm registry */
let downloadModuleSpmPromise = (name, version, targetPath) => {
  return new Promise((resolve, reject) => {
    let url = `http://api.spm-style.com/module/${name}/${version}`
    if (!targetPath.startsWith('/')) { targetPath = `${__dirname}/${targetPath}` }
    Fs.mkdir(targetPath, err => {
      if (err && err.code !== 'EEXIST') { return reject(err) }
      Request.get(url)
      .pipe(
        Tar.x({
          strip: 1,
          C: targetPath
        })
        .on('error', reject)
        .on('finish', () => {
          console.log({name: name, version: version, status: 'success', targetPath})
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

/* whitespaces cleaner for strings */
let removeWhitespaces = (str) => {
  if (str.length) {
    let i = 0
    while (str[i] === ' ') {
      i++
    }
    let j = str.length - 1
    while (str[j] === ' ') {
      j--
    }
    if (j !== 0) {
      return str.substring(i, j + 1)
    }
  }
  return str
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
    Inquirer.prompt([{
      type: 'confirm',
      name: 'confirmation',
      default: defaultValue,
      message: text
    }])
    .then(answer => {
      if (!answer.confirmation) {
        console.log(Chalk.hex(CONST.ERROR_COLOR)('Aborted by user'))
        process.exit()
      }
      resolve(res)
    })
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
let deleteFolderRecursive = (path, callback, firstRecursive = true) => {
  if (Fs.existsSync(path)) {
    for (let file of Fs.readdirSync(path)) {
      let currentPath = path + '/' + file
      if (Fs.lstatSync(currentPath).isDirectory()) {
        deleteFolderRecursive(currentPath, callback, false)
      } else {
        Fs.unlinkSync(currentPath)
      }
    }
    Fs.rmdirSync(path)
    if (firstRecursive) {
      return callback()
    }
  } else { return callback() }
}

/* Promise-based folder deleter */
let deleteFolderRecursivePromise = (path) => {
  return new Promise((resolve, reject) => {
    deleteFolderRecursive(path, () => {
      return resolve(path)
    })
  })
}

/* Deletes everything in a folder but the folder itself */
let deleteContentFolderRecursive = (path, callback, firstRecursive = true) => {
  if (Fs.existsSync(path)) {
    for (let file of Fs.readdirSync(path)) {
      let currentPath = path + '/' + file
      if (Fs.lstatSync(currentPath).isDirectory()) {
        console.log('********* Boucle ********')
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

/* Path.relative cannot compute relative path between unexisting files */
let unrealRelativePath = (file1, file2) => {
  if (!file1 || !file2) { return file2 }
  let tab1 = file1.split('/')
  let tab2 = file2.split('/')
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
    res = res + '../'
    i++
  }
  while (j < tab2.length) {
    res = `${res}${tab2[j]}/`
    j++
  }
  while (res.endsWith('/')) { res = res.slice(0, -1) }
  return res
}

/* removes '.' and '..' from input path */
let cleanFilePath = (filePath) => {
  let tab = filePath.split('/')
  for (let i = 0; i < tab.length; i++) {
    if (tab[i] === '.') {
      tab.splice(i, 1)
      i--
    } else if (tab[i] === '..') {
      tab.splice(i - 1, 2)
    }
  }
  let res = tab.join('/')
  while (res.endsWith('/')) { res = res.slice(0, -1) }
  return res
}

/* reads and parses a json file */
let parseJsonFileSync = (filePath) => {
  return JSON.parse(Fs.readFileSync(filePath))
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

/* checks mixins, maps variables in content and generates a parameter list for a mixin */
let parametersInstanceParsingPromise = (name, entryPath, parameters, packageClasses) => {
  return new Promise((resolve, reject) => {
    let variables = []
    let variableObject = {}
    Fs.readFile(entryPath, 'utf8', (err, data) => {
      if (err) { return reject(err) } else {
        let i = data.indexOf(`@mixin spm-class_${parameters.target.name}(`)
        if (i < 0) { return reject(new Error(`Missing mixin ${parameters.target.name} in ${entryPath}`)) }
        i = data.indexOf('(', i)
        let j = data.indexOf(')', i)
        let table = data.substring(i + 1, j).split(',')
        for (let index = 0; index < table.length - 1; index++) {
          if (!table[index].startsWith('$local-') || !Object.keys(variableObject).includes(table[index].substring(7))) {
            return reject(new Error(`wrong parameters in ${entryPath} mixins`))
          }
          let content = {
            name: table[index].substring(7),
            value: variableObject[table[index].substring(7)]
          }
          variableObject[table[index].substring(7)] = content
          variables.push(content)
        }
        for (let item of parameters.target.variables) {
          if (!variableObject[item.name]) { return reject(new Error(`Incorrect instance variables in ${entryPath} - ${item}`)) }
          variableObject[item.name].value = item.value
        }
        let res = ''
        for (let parameter of variables) {
          res += `${parameter.value},`
        }
        res += `'${name}'`
        return resolve(res)
      }
    })
  })
}

/* generates scss instance input and file */
let createInstancePromise = (name, target, entry, parameters, packageClasses) => {
  return new Promise((resolve, reject) => {
      //A SUPPRIMER AVEC L'UPDATE DU CONTROLLER_PUBLISH => index.css to index.scss
      entry = `${entry.substring(0, entry.lastIndexOf('.'))}.scss`
      // FIN DE LA SUPPRESSION
    parametersInstanceParsingPromise(name, `${target}/${entry}`, parameters, packageClasses)
    .then(parametersList => {
      let data = `@import '../${entry}';\n\n@include spm-class_${parameters.target.name}(${parametersList});\n`
      Fs.writeFile(`{target}/dist/${name}.scss`, data, err => {
        if (err) { return reject(err) } else { return resolve(name) }
      })
    })
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

/* removes comment and other neutral characters from css */
let cssCleaner = (str) => {
  if (!str || !str.length) { return str }
  let startIndex = 0
  let i, j
  while ((i = str.indexOf('/*', startIndex)) >= 0) {
    let j = str.indexOf('*/', i)
    if (j < 0) { return str }
    str = `${str.substring(0, i)}${str.substring(j + 2)}`
    startIndex = i + 1
  }
  i = 0
  while (i < str.length) {
    if (SCSS_IGNORED_CHARS.includes(str[i])) {
      j = 1
      while (SCSS_IGNORED_CHARS.includes(str[i + j])) { j++ }
      str = `${str.substring(0, i)} ${str.substring(i + j)}`
    }
    i++
  }
  return removeWhitespaces(str)
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
      useBis.pathInstances = JSON.parse(JSON.stringify(use.pathInstances))
      for (let pathInstance in useBis.pathInstances) {
        let toBeAdded = true
        for (let importedFile of detectedImports) {
          if (Path.relative(`${item.substring(0, item.lastIndexOf('/'))}/${importedFile}`, pathInstance) === '') {
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

/* turns a scss file into a css file and removes scss files + map */
let convertScssToCss = (item, path, file) => {
  return new Promise((resolve, reject) => {
    Sass.render({
      file: `${path}/${file}.scss`,
      outFile: `${path}/${file}.css`
    }, function (err, result) {
      if (err) { return reject(err) }
      Fs.writeFile(`${path}/${file}.css`, result.css, err => {
        if (err) { return reject(err) }
        Fs.rename(`${path}/${file}.scss`, `${path}/src/${file}.scss`, err => {
          if (err) { return reject(err) }
          return resolve(item)
        })
      })
    })
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
let tgzFilePromise = (input, output) => {
  return new Promise((resolve, reject) => {
    let inputFolder, inputFile
    while (input !== '' && input.endsWith('/')) { input = input.slice(0, -1) }
    while (output !== '' && output.endsWith('/')) { output = output.slice(0, -1) }
    if (!input.startsWith('/')) { input = `${__dirname}/${input}` }
    if (!output.startsWith('/')) { output = `${__dirname}/${output}` }
    let i = input.lastIndexOf('/')
    if (i === -1) {
      inputFolder = ''
      inputFile = input
    } else {
      inputFolder = input.substring(0, i)
      inputFile = input.substring(i + 1)
    }
    Tar.c({
      file: output,
      C: inputFolder,
      gzip: true
    }, [inputFile]).then(() => {
      return resolve(output)
    })
    .catch(reject)
  })
}

/* creates a symlink from src to dest */
let createSymlinkPromise = (src, dest) => {
  return new Promise((resolve, reject) => {
    Fs.symlink(dest, src, err => {
      if (err) { return reject(err) }
      return resolve(src)
    })
  })
}

module.exports = {
  getCurrentPath,
  getPackageSpmFilePromise,
  promptConfirmation,
  writeContent,
  getCurrentDirectory,
  deleteFolderRecursive,
  deleteFolderRecursivePromise,
  unrealRelativePath,
  cleanFilePath,
  deleteContentFolderRecursive,
  directoryExists,
  createFolderIfUnexistantSync,
  downloadModuleSpmPromise,
  parseJsonFileSync,
  cleanValue,
  createInstancePromise,
  writeFilePromise,
  removeWhitespaces,
  variableType,
  defineMixinName,
  findAllImportInString,
  cssCleaner,
  updateUsedFilesPromise,
  convertScssToCss,
  displayMessagesPromise,
  tgzFilePromise,
  getPackageSpmFileSync,
  createSymlinkPromise
}
