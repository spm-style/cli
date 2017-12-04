let Fs = require('fs')
let Path = require('path')

let Inquirer = require('inquirer')
let Chalk = require('chalk')
let Targz = require('tar.gz')
let request = require('request')
let Sass = require('node-sass')

let Common = require('./common')
let CONST = require('./const')
let Publish = require('./models').Publish
let PublishPackageSpm = require('./models').PublishPackageSpm

let debug = false

let existsPackagePromise = (publication) => { // (1a)
  if (debug) console.log(' ** stage 1a **')
  return new Promise((resolve, reject) => {
    let currentDirectory = Common.getCurrentPath()
    while (currentDirectory !== CONST.USER_DIRECTORY) {
      if (Fs.existsSync(currentDirectory + '/package-spm.json')) {
        let jsonFile = Common.parseJsonFileSync(currentDirectory + '/package-spm.json')
        switch (jsonFile.name.split('_').length) {
          case 1:
            if (jsonFile.name === publication.getKey('name')) {
              publication.setKey('path', currentDirectory)
              publication.setKey('action', 'create')
              return resolve(publication)
            }
            break
          case 2:
            if (jsonFile.name.split('_')[1] === publication.getKey('name')) {
              publication.setKey('path', currentDirectory)
              publication.setKey('action', 'update')
              return resolve(publication)
            }
            break
        }
      }
      currentDirectory = currentDirectory.substring(0, currentDirectory.lastIndexOf('/'))
    }
    return reject(new Error('the module you\'re trying to publish has no correct package-spm.json file'))
  })
}

let checkModuleVersion = (jsonFile, publication) => { // (1bI1)
  return new Promise((resolve, reject) => {
    if (publication.getKey('version')) {
      jsonFile.version = publication.getKey('version')
      return resolve(jsonFile)
    } else if (jsonFile.version && !(/^[0-9]+[.][0-9]+[.][0-9]+$/.test(jsonFile.version))) {
      return reject(new Error('Incorrect version in package-spm.json'))
    } else {
      Inquirer.prompt([{
        name: 'version',
        message: 'Please specify the version you want to publish',
        default: jsonFile.version || '1.0.0',
        validate: (value) => {
          return ((/^[0-9]+[.][0-9]+[.][0-9]+$/.test(value)) ? true : Chalk.hex(CONST.WARNING_COLOR)('valid version format: x.x.x'))
        }
      }])
      .then(answer => {
        if (!answer.version) { return reject(new Error('Aborted by user')) }
        jsonFile.version = answer.version
        return resolve(jsonFile)
      })
    }
  })
}

let promptCorrection = (key, jsonFile, message) => { // (1bI2)
  return new Promise((resolve, reject) => {
    if (!jsonFile[key]) {
      console.log(key + ' is required to publish a module')
      Inquirer.prompt([{
        name: key,
        message: message || key,
        validate: (value) => {
          return (value.length && value.length > 0) ? true : Chalk.hex(CONST.WARNING_COLOR)(`you must enter the following information: ${key}`)
        }
      }])
      .then(answer => {
        if (!answer[key]) { return reject(new Error('Aborted by user')) }
        jsonFile[key] = answer[key]
        return resolve(jsonFile)
      })
      .catch(reject)
    } else {
      return resolve(jsonFile)
    }
  })
}

let correctDevicesInProject = (responsiveness) => {
  let devices = ['watch', 'mobile', 'phablet', 'tablet', 'laptop', 'screen xl']
  for (let item of responsiveness) {
    if (!devices.includes(item)) { return false }
  }
  return true
}

let promptResponsiveness = (jsonFile) => {
  return new Promise((resolve, reject) => {
    let key = 'responsiveness'
    if (!jsonFile[key] || !Array.isArray(jsonFile[key]) || !jsonFile[key].length || !correctDevicesInProject(jsonFile[key])) {
      Inquirer.prompt([{
        name: 'responsiveness',
        message: 'responsive compatibility',
        type: 'checkbox',
        choices: [
          {name: 'watch', checked: false},
          {name: 'mobile', checked: false},
          {name: 'phablet', checked: false},
          {name: 'tablet', checked: false},
          {name: 'laptop', checked: true},
          {name: 'screen xl', checked: false}
        ],
        validate: (value) => {
          return (value.length && value.length > 0) ? true : Chalk.hex(CONST.WARNING_COLOR)('select at least one compatible device')
        }
      }])
      .then(answer => {
        if (!answer[key]) { return reject(new Error('Aborted by user')) }
        jsonFile[key] = answer[key] // régler le point pour les tableaux !!
        return resolve(jsonFile)
      })
      .catch(reject)
    } else {
      return resolve(jsonFile)
    }
  })
}

let checkPackagePromise = (jsonFile, publication) => { // (1bI)
  if (debug) console.log('  + stage 1bi +')
  return new Promise((resolve, reject) => {
    // pour l'instant on on check le style et le type
    if (jsonFile) {
      // style
      switch (jsonFile.style) {
        case 'css':
          publication.setKey('style', 'css')
          break
        case 'scss':
          publication.setKey('style', 'scss')
          break
        case 'sass':
          publication.setKey('style', 'sass')
          break
        case 'less':
          publication.setKey('style', 'less')
          break
        default:
          return reject(new Error('the project\'s style is uncorrect'))
      }
      // type
      switch (jsonFile.type) {
        case 'native':
          publication.setKey('type', 'native')
          break
        case 'component':
          publication.setKey('type', 'component')
          break
        case 'template':
          publication.setKey('type', 'template')
          break
        default:
          return reject(new Error('the project\'s type is uncorrect'))
      }
      if (publication.getKey('version')) {
        jsonFile.version = publication.getKey('version')
      }
      checkModuleVersion(jsonFile, publication)
      .then(jsonFile => { return promptCorrection('name', jsonFile) })
      .then(jsonFile => { return promptCorrection('version', jsonFile) })
      .then(jsonFile => { return promptCorrection('description', jsonFile) })
      .then(jsonFile => { return promptCorrection('author', jsonFile) })
      .then(jsonFile => { return promptCorrection('entry', jsonFile) })
      .then(jsonFile => { return promptCorrection('scripts', jsonFile) })
      .then(jsonFile => { return promptCorrection('license', jsonFile) })
      .then(jsonFile => { return promptCorrection('repository', jsonFile) })
      .then(jsonFile => { return promptCorrection('readme', jsonFile) })
      .then(jsonFile => { return promptCorrection('keywords', jsonFile) })
      .then(jsonFile => { return promptCorrection('main', jsonFile) })
      .then(jsonFile => { return promptCorrection('category', jsonFile) })
      .then(jsonFile => { return promptCorrection('classes', jsonFile) })
      .then(promptResponsiveness)
      .then(jsonFile => {
        publication.setKey('version', publication.getKey('version') || jsonFile.version)
        publication.setKey('main', jsonFile.main)
        publication.setKey('classes', jsonFile.classes)
        publication.setKey('description', jsonFile.description)
        publication.setKey('entry', jsonFile.entry)
        publication.setKey('dependencies', jsonFile.dependencies)
        publication.setKey('variables', jsonFile.variables)
        publication.setKey('scripts', jsonFile.scripts)
        publication.setKey('repository', jsonFile.repository)
        publication.setKey('readme', jsonFile.readme)
        publication.setKey('license', jsonFile.license)
        publication.setKey('keywords', jsonFile.keywords)
        publication.setKey('responsiveness', jsonFile.responsiveness)
        publication.setKey('category', jsonFile.category)
        return resolve(publication)
      })
      .catch(err => { return reject(new Error(`the package-spm.json is not correct :\n${err}`)) })
    } else {
      return reject(new Error('the package-spm.json is not correct'))
    }
  })
}

let parsePackagePromise = (publication) => { // (1b)
  if (debug) console.log(' ** stage 1b **')
  return new Promise((resolve, reject) => {
    if (publication.getKey('path')) {
      let jsonFile = Common.parseJsonFileSync(publication.getKey('path') + '/package-spm.json')
      checkPackagePromise(jsonFile, publication)
      .then(resolve)
      .catch(reject)
    } else {
      return reject(publication)
    }
  })
}

let verifyPackagePromise = (publication) => { // (1)
  if (debug) console.log('--- stage 1 ---')
  return new Promise((resolve, reject) => {
    // on regarde si on a un package.json correspondant au nom du publish
    existsPackagePromise(publication)
    // on le parse et on le stocke dans un objet json
    .then(parsePackagePromise)
    // on vérifie l'objet json sur certaines propriétés
    .then(resolve)
    .catch(reject)
  })
}

let verifyRefDomPromise = (publication) => {
  if (debug) console.log('-- stage 1bis -')
  return new Promise((resolve, reject) => {
    if (!Fs.existsSync(`${publication.getKey('path')}/ref-dom.html`)) {
      return reject(new Error('error - reference DOM missing'))
    }
    Fs.readFile(`${publication.getKey('path')}/ref-dom.html`, 'utf8', (err, data) => {
      if (err) { return reject(new Error('error - issue reading reference DOM')) }
      publication.setKey('dom', {type: 'custom', value: data})
      return resolve(publication)
    })
  })
}

let verifyModulePromise = (publication) => { // (2)
  if (debug) console.log('--- stage 2 ---')
  return new Promise((resolve, reject) => {
    // vérifier qu'il y a index
    switch (publication.getKey('type')) {
      case 'native': // css, scss, sass, less

        break
      case 'component': // react, angular, VueJS, ...

        break
      case 'template': // ( ?->DOM)

        break
      default:
        return reject(new Error('the project\'s type is uncorrect'))
    }
    return resolve(publication)
  })
}

let confirmationPublishPromise = (publication) => { // (3)
  if (debug) console.log('--- stage 3 ---')
  return new Promise((resolve, reject) => {
    console.log(`You are about to publish the module ${publication.getKey('name')}@${publication.getKey('version')}\nif you have the rights to publish, your contribution will be added in spm registry`)
    Common.promptConfirmation(publication, true, 'Do you confirm this ')
    .then(resolve)
    .catch(reject)
  })
}

let promptUserPromise = (publication) => { // (4)
  if (debug) console.log('--- stage 4 ---')
  return new Promise((resolve, reject) => {
    let questions = [
      {
        name: 'username',
        message: 'Username',
        validate: (value) => {
          return (value.length && value.length > 2) ? true : Chalk.hex(CONST.WARNING_COLOR)('use at least 3 characters')
        }
      },
      {
        name: 'password',
        type: 'password',
        message: 'Password',
        validate: (value) => {
          return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(value) ? true : Chalk.hex(CONST.WARNING_COLOR)('Please enter at least 8 characters with at least 1 letter and 1 number')
        }
      }
    ]

    Inquirer.prompt(questions)
      .then(answer => {
        publication.setKey('username', answer.username)
        publication.setKey('password', answer.password)
        return resolve(publication)
      })
      .catch(reject)
  })
}

let parseIgnoreFiles = (ignoreFiles) => { // (5aI)
  if (debug) console.log('  + stage 5aI +')
  let ignores = []
  for (let ignoreFile of ignoreFiles) {
    if (Fs.existsSync(ignoreFile)) {
      for (let file of Fs.readFileSync(ignoreFile).toString().split('\n')) {
        if (file !== '') {
          ignores.push(file)
        }
      }
    }
  }
  return ignores
}

let updateDefaultIgnoreFiles = (ignores) => { // (5aJ)
  if (debug) console.log('  + stage 5aJ +')
  let defaultIgnoreFiles = ['.tmp_sass', 'tmp/', '.gitignore', '.spmignore', 'package-spm.json', 'ref-dom.html'] //, 'spm_modules/'
  for (let ignoreFile of defaultIgnoreFiles) {
    if (!ignores.includes(ignoreFile)) {
      ignores.push(ignoreFile)
    }
  }
  return ignores
}

let verifyIgnoredFilesPromise = (publication) => { // (5a)
  if (debug) console.log(' ** stage 5a **')
  // on mets les fichiers par défaut, les fichiers des gitignore et spmignore et les modules dépendants non appelés.
  return new Promise((resolve, reject) => {
    let ignores = parseIgnoreFiles([
      publication.getKey('path') + '/.gitignore',
      publication.getKey('path') + '/.spmignore'
    ])
    publication.setKey('ignore', updateDefaultIgnoreFiles(ignores))
    return resolve(publication)
  })
}

/* CHECK CSS SELECTORS ACCORDING TO PROJECT CLASSES */
let isCssAccepted = (char) => {
  if ((char >= 'a' && char <= 'z') ||
    (char >= 'A' && char <= 'Z') ||
    (char >= '0' && char <= '9') ||
    (char === '-') ||
    (char === '_')) {
    return 1 // le nom de la classe n'est pas terminé
  } else if (char.charCodeAt(0) >= 127) {
    return -1 // le nom de la classe n'est pas terminé et le caractère qui suit est invalide
  }
  return 0 // le nom de la classe est terminé
}

let parseSelector = (selector, classes) => {
  let item
  if (selector.indexOf(' ') >= 0) {
    let table = selector.split(' ')
    let i = 0
    if (i >= table.length) {
      return null
    } else {
      item = table[i]
    }
  } else {
    item = selector
  }
  for (let moduleClass of classes) {
    let i = item.indexOf('.' + moduleClass)
    if (i >= 0 &&
      ((i + moduleClass.length + 1 === item.length) || isCssAccepted(item[i + moduleClass.length + 1]) === 0)) {
      return item
    }
  }
  return null
}

let parseSelectors = (data, classes) => {
  let parsed = data.split(',')
  for (let selector of parsed) {
    selector = Common.removeWhitespaces(selector)
    if (!selector.startsWith('@') && !parseSelector(selector, classes)) {
      return false
    }
  }
  return true
}

let checkClass = (file, publication, style = publication.style) => {
  return new Promise((resolve, reject) => {
    if (style === 'css') {
      Fs.readFile(file, 'utf8', function (err, data) {
        if (err) { return reject(err) }
        data = Common.cssCleaner(data)
        let startIndex = 0
        let i, j, k
        let tmpClasses = publication.classes.concat([publication.main])

        while ((i = data.indexOf('{', startIndex)) >= 0 &&
          ((j = data.indexOf('}', startIndex)) >= 0 || true) &&
          ((k = data.indexOf(';', startIndex)) >= 0 || true)) {
          // if i found before j
          if (i >= 0 && i <= j && i <= k) {
            if (!parseSelectors(data.substring(startIndex, i), tmpClasses)) {
              return reject(new Error(`incorrect selector found : ${data.substring(startIndex, i)}`))
            }
            startIndex = i + 1
          } else { startIndex = Math.max(j, k) + 1 }
        }
        return resolve(publication)
      })
    } else {
      return resolve(publication)
    }
  })
}
/* END OF CSS SELECTORS / PROJECT CLASSES CHECK */

/* PARSING INFORMATION FROM @IMPORT TAGS */
let importToFile = (data) => {
  if (data.length > 2) {
    if (data.startsWith("'") &&
      data.split("'").length === 3 &&
      data.split("'")[0] === '') {
      return data.split("'")[1]
    }
    if (data.startsWith('"') &&
      data.split('"').length === 3 &&
      data.split('"')[0] === '') {
      return data.split('"')[1]
    }
    if (data.startsWith('url(') && data.indexOf(')') > 5) {
      return importToFile(data.substring(4, data.indexOf(')')))
    }
  }
  return null
}

let recursiveCheckModule = (path, file, publication) => { // (5bI)
  if (debug) console.log('  + stage 5bI + recursive')
  if (!path.endsWith('/')) { path += '/' }
  publication.ressources.push(path + file)
  return new Promise((resolve, reject) => {
    if (!Fs.existsSync(path + file)) {
      publication.errors.push(`imported file ${path}${file} doesn't exist`)
      return resolve(publication)
    } else {
      // fonction séparée
      Fs.readFile(path + file, 'utf8', (err, data) => {
        if (err) {
          return reject(err)
        } else {
          checkClass(path + file, publication)
          .then(res => {
            return new Promise((resolve, reject) => {
              let dataAt = data.split('@import ')
              let dataAtClose = []
              for (let elem of dataAt) {
                if (elem.indexOf(';') >= 0) {
                  let resultFile = importToFile(elem.split(';')[0])
                  if (resultFile) {
                    dataAtClose.push(resultFile)
                  }
                }
              }
              let promises = []
              for (let module of dataAtClose) {
                promises.push(recursiveCheckModule(path + module.substring(0, module.lastIndexOf('/')), module.split('/')[module.split('/').length - 1], publication))
              }
              Promise.all(promises)
                .then(() => { return resolve(publication) })
                .catch(reject)
            })
          })
          .then(resolve)
          .catch(reject)
        }
      })
    }
  })
}

let scssToCssForCheck = (publication) => { // (5bJ)
  if (debug) console.log('  + stage 5bJ +')
  return new Promise((resolve, reject) => {
    if (publication.style === 'scss') {
      if (!Fs.existsSync(publication.path + '/.tmp_sass')) {
        Fs.mkdirSync(publication.path + '/.tmp_sass')
      }
      Fs.writeFile(`${publication.path}/.tmp_sass/entry.scss`, `@import '../${publication.entry}';`, err => {
        if (err) { return reject(err) }
        Sass.render({
          file: `${publication.path}/.tmp_sass/entry.scss`,
          outFile: `${publication.path}/.tmp_sass/full.css`
        }, function (error, result) {
          if (!error) {
            Fs.writeFile(publication.path + '/.tmp_sass/full.css', result.css, function (err) {
              if (!err) {
                checkClass(publication.path + '/.tmp_sass/full.css', publication, 'css')
                .then(() => {
                  Common.deleteFolderRecursive(`${publication.path}/.tmp_sass`, () => {
                    return resolve(publication)
                  })
                })
                .catch(reject)
              } else { return reject(new Error('error while converting scss file to css')) }
            })
          } else { return reject(error.message) } // node-sass error message
        })
      })
    } else {
      return resolve(publication)
    }
  })
}

let confirmDependancyRemoval = (publication) => {
  return new Promise((resolve, reject) => {
    if (Object.keys(publication.getKey('removed')).length) {
      let questions = [
        {
          type: 'checkbox',
          name: 'keeping',
          message: 'spm has detected the following unused dependancies - which one do you want to keep ?\n',
          choices: Object.keys(publication.getKey('removed'))
        }
      ]

      Inquirer.prompt(questions)
      .then(answer => {
        let removed = {}
        console.log('pubRemoved', publication.getKey('removed'))
        console.log('keeping', answer.keeping)
        for (let item in publication.getKey('removed')) {
          if (!(answer.keeping).includes(item)) {
            removed[item] = publication.getKey('dependencies')[item]
            delete publication.getKey('dependencies')[item]
          }
        }
        publication.setKey('removed', removed)
        return resolve(publication)
      })
      .catch(reject)
    } else {
      return resolve(publication)
    }
  })
}

let unusedDependancies = (publication) => { // (5bK)
  return new Promise((resolve, reject) => {
    let dependencies = Object.assign({}, publication.dependencies)
    let removed = {}
    for (let dependency in dependencies) {
      let flag = false
      for (let ressource of publication.ressources) {
        if (Path.relative(`${publication.path}/spm_modules/${dependency}`, ressource.substring(0, ressource.lastIndexOf('/'))) === '') {
          flag = true
          break
        }
      }
      if (!flag) {
        publication.warnings.push(`dependency ${dependency} is not used`)
        removed[dependency] = dependencies[dependency]
      }
    }
    publication.setKey('removed', removed)
    confirmDependancyRemoval(publication)
    .then(resolve)
    .catch(reject)
  })
}

let checkModule = (publication) => { // (5b)
  if (debug) console.log(' ** stage 5b **')
  return new Promise((resolve, reject) => {
    recursiveCheckModule(publication.path, publication.entry, publication)
    .then(scssToCssForCheck)
    .then(unusedDependancies)
    .then(resolve)
    .catch(reject)
  })
}

let recursiveDirectoryCopy = (path, directory, ignores) => { // (5cI) -> fonction auxiliaire : dans une common
  if (debug) console.log('  + stage 5cI +')
  return new Promise((resolve, reject) => {
    let files = Fs.readdirSync(directory)
    if (files.length > 0) {
      let promises = []
      for (let file of files) {
        if (Fs.lstatSync(directory + file).isDirectory()) {
          file += '/'
        }
        if (!ignores.includes(file)) {
          if (Fs.lstatSync(directory + file).isDirectory()) {
            if (!Fs.existsSync(path + '/tmp' + directory.substring(path.length) + file)) {
              Fs.mkdirSync(path + '/tmp' + directory.substring(path.length) + file)
            }
            let subIgnores = []
            for (let ignore of ignores) {
              if (ignore.startsWith(file)) {
                subIgnores.push(ignore.substring(file.length))
              }
            }
            promises.push(recursiveDirectoryCopy(path, directory + file, subIgnores))
          } else {
            let read = Fs.createReadStream(path + directory.substring(path.length) + file)
            let write = Fs.createWriteStream(path + '/tmp' + directory.substring(path.length) + file)
            .on('end', () => {
              return resolve()
            })
            read.pipe(write)
          }
        }
      }
      Promise.all(promises)
      .then(resolve)
      .catch(reject)
    } else { return resolve() }
  })
}

let publicationCopyPromise = (publication) => { // (5c) prépare déjà la publication, il faut vérifier validité et compléter ignores avant
  if (debug) console.log(' ** stage 5c **')
  return new Promise((resolve, reject) => {
    if (!Fs.existsSync(publication.getKey('path') + '/tmp')) {
      Fs.mkdirSync(publication.getKey('path') + '/tmp')
    }
    recursiveDirectoryCopy(publication.getKey('path'), publication.getKey('path') + '/', publication.getKey('ignore'))
    .then(() => { return resolve(publication) })
    .catch(reject)
  })
}

let createTargzPromise = (publication) => { // (5d)
  if (debug) console.log(' ** stage 5d **')
  return new Promise((resolve, reject) => {
    let read = Targz().createReadStream(publication.getKey('path') + '/tmp')
    if (!Fs.existsSync(publication.getKey('path') + '/.tmp')) {
      Fs.mkdirSync(publication.getKey('path') + '/.tmp')
    }
    let write = Fs.createWriteStream(publication.getKey('path') + '/.tmp/' + publication.getKey('name') + '.tar.gz')
    read.pipe(write).on('finish', () => {
      return resolve(publication)
    })
  })
}

let cleanUpWorkingDirectory = (publication) => { // (5fI)
  if (debug) console.log(' ** stage 5g ** ')
  return new Promise((resolve, reject) => {
    Common.deleteFolderRecursive(publication.getKey('path') + '/.sass-cache', () => {
      Common.deleteFolderRecursive(publication.getKey('path') + '/tmp', () => {
        // error management ?
        Common.deleteFolderRecursive(publication.getKey('path') + '/.tmp', () => {
          // error management ?
          return resolve(publication)
        })
      })
    })
  })
}

let sendPublicationToRegistryPromise = (publication) => { // (5f)
  if (debug) console.log(' ** stage 5f ** POST TO SPM REGISTRY')
  return new Promise((resolve, reject) => {
    let packageSpm = new PublishPackageSpm(
      publication.getKey('name'),
      publication.getKey('version'),
      publication.getKey('type'),
      publication.getKey('style'),
      publication.getKey('main'),
      publication.getKey('classes'),
      publication.getKey('description'),
      publication.getKey('entry'),
      publication.getKey('dependencies'),
      publication.getKey('scripts'),
      publication.getKey('repository'),
      publication.getKey('readme'),
      publication.getKey('keywords'),
      publication.getKey('engines'),
      publication.getKey('license'),
      publication.getKey('dom'),
      publication.getKey('responsiveness'),
      publication.getKey('category')
    )
    let formData = {}
    formData.package = JSON.stringify(packageSpm)
    if (debug) console.log('package', formData.package)
    formData.module = Fs.createReadStream(publication.getKey('path') + '/.tmp/' + publication.getKey('name') + '.tar.gz')
    formData.login = publication.getKey('username')
    formData.password = publication.getKey('password')
    request.put({url: CONST.PUBLISH_URL, formData: formData}, function (error, response, body) {
      cleanUpWorkingDirectory(publication)
      .then(() => {
        if (error) { return reject(new Error(`there was an error sending data to spm registry - please try again later or contact our support\n${error}`)) }
        let res = JSON.parse(body)
        if (Math.floor(res.statusCode / 100) === 4) {
          return reject(Chalk.hex(CONST.ERROR_COLOR)(res.message))
        } else {
          console.log(Chalk.hex(CONST.SUCCESS_COLOR)(res.name + '@' + res.version + ' has been successfully created'))
          return resolve(publication)
        }
      })
      .catch(reject)
    })
  })
}

let publishModulePromise = (publication) => { // (5)
  if (debug) console.log('--- stage 5 ---')
  return new Promise((resolve, reject) => {
    verifyIgnoredFilesPromise(publication)
    .then(checkModule)
    .then(publicationCopyPromise)
    .then(createTargzPromise)
    .then(sendPublicationToRegistryPromise)
    .then(resolve)
    .catch(reject)
  })
}

/*
pour gérer les fichiers .map, faire une liste des fichiers au départ et ne modifier que les fichiers finaux ? ou faire tout dans un autre répertoire ?
*/

/* si absence de dom-ref, checker la balise du package.json */

module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('publish')
    .alias('p')
    .description('to publish your module in the spm registry')
    .arguments('<moduleName>')
    .option('-t, --tag <tag>', "your module's version, latest by default")
    .option('-a, --access <access>', 'to specify the authorization level to your module', /^(public|private)$/i, 'public')
    .action((moduleName, options) => {
      let publication = new Publish(moduleName, options.tag)
      // 1) checks package-spm.json côté CLIENT pour vérifier que le package est bien formaté verifyPackagePromise()
      verifyPackagePromise(publication)
      .then(verifyRefDomPromise)
      // 2) check content verifyModulePromise() pour vérifier la bonne typologie (les bons fichiers) | Promise.all ou .then()
      .then(verifyModulePromise)
      // 3) confirmationPublishPromise() prompt with Y/n to récapituler
      .then(confirmationPublishPromise)
      // 3bis first cleanup before any action
      .then(cleanUpWorkingDirectory)
      // 4) identifyUser('adrien', 'poupoupou90') identifyUserPromise()
      .then(promptUserPromise)
      // 5) publishModulePromise() POST call to registry avec logique (*) côté SERVEUR
      .then(publishModulePromise)
      // 6) responsePublishModulePromise(?)
      // 7) updateLocalPackage() -> en particulier le numéro de version
      // 8) displayMessagePromise
      .then(resolve)
      .catch(reject)
    })
    .on('--help', function () {
      console.log('Publishes \'.\' if no argument supplied')
    })
  })
}
