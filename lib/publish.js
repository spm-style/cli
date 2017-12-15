let Fs = require('fs')
let Path = require('path')
let Inquirer = require('inquirer')
let Chalk = require('chalk')
let Request = require('request')
let Sass = require('node-sass')
let Common = require('./common')
let CONST = require('./const')
let Publish = require('./models').Publish
let PublishPackageSpm = require('./models').PublishPackageSpm
let Debug = require('./debug')
let Authentify = require('./authentify')

/* Checks where package-spm.json file is to define the project's scope */
let existsPackagePromise = (publication) => {
  if (publication.debug) { Debug() }
  return new Promise((resolve, reject) => {
    let currentDirectory = Common.getCurrentPath()
    while (currentDirectory !== CONST.USER_DIRECTORY) {
      if (Fs.existsSync(currentDirectory + '/package-spm.json')) {
        let jsonFile = Common.parseJsonFileSync(currentDirectory + '/package-spm.json')
        publication.name = jsonFile.name
        publication.path = currentDirectory
        publication.jsonFile = jsonFile
        return resolve(publication)
      }
      currentDirectory = currentDirectory.substring(0, currentDirectory.lastIndexOf('/'))
    }
    return reject(new Error('the module you\'re trying to publish has no correct package-spm.json file'))
  })
}

/* Checks what the module version is and opens a prompt if not filled */
let checkModuleVersion = (jsonFile, publication) => {
  if (publication.debug) { Debug() }
  return new Promise((resolve, reject) => {
    if (publication.version) {
      jsonFile.version = publication.version
      return resolve(jsonFile)
    } else if (jsonFile.version && !(/^[0-9]+[.][0-9]+[.][0-9]+$/.test(jsonFile.version))) {
      return reject(new Error('Incorrect version in package-spm.json'))
    } else {
      Inquirer.prompt([{
        name: 'version',
        message: 'Please specify the version you want to publish',
        default: jsonFile.version || '1.0.0',
        /* all versions are formatted as x1.x2.x3 with xi positive or null integers */
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

/* Generic function used in publish to prompt for missing and mandatory parameters */
let promptCorrection = (key, jsonFile, message) => {
  return new Promise((resolve, reject) => {
    if (!jsonFile[key]) {
      console.log(key + ' is required to publish a module')
      Inquirer.prompt([{
        name: key,
        message: message || key,
        /* the requested element is mandatory and cannot be empty */
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

/* Dedicated compatibility checker */
let correctDevicesInProject = (responsiveness) => {
  let devices = ['watch', 'mobile', 'phablet', 'tablet', 'laptop', 'screen xl']
  for (let item of responsiveness) {
    if (!devices.includes(item)) { return false }
  }
  return true
}

/* Specific responsiveness checker and prompter */
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
        /* the publication must at least be compatible with one type of devices */
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

/* Checks all mandatory information from the package to prepare the publication */
let checkPackagePromise = (jsonFile, publication) => {
  if (publication.debug) { Debug() }
  return new Promise((resolve, reject) => {
    if (jsonFile) {
      // style
      switch (jsonFile.style) {
        case 'css':
          publication.style = 'css'
          break
        case 'scss':
          publication.style = 'scss'
          break
        case 'sass':
          publication.style = 'sass'
          break
        case 'less':
          publication.style = 'less'
          break
        default:
          return reject(new Error('the project\'s style is uncorrect'))
      }
      // type
      switch (jsonFile.type) {
        case 'native':
          publication.type = 'native'
          break
        case 'component':
          publication.type = 'component'
          break
        case 'template':
          publication.type = 'template'
          break
        default:
          return reject(new Error('the project\'s type is uncorrect'))
      }
      if (publication.version) {
        jsonFile.version = publication.version
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
        publication.version = publication.version || jsonFile.version
        publication.main = jsonFile.main
        publication.classes = jsonFile.classes
        publication.description = jsonFile.description
        publication.entry = jsonFile.entry
        publication.dependencies = jsonFile.dependencies
        publication.variables = jsonFile.variables
        publication.scripts = jsonFile.scripts
        publication.repository = jsonFile.repository
        publication.readme = jsonFile.readme
        publication.license = jsonFile.license
        publication.keywords = jsonFile.keywords
        publication.responsiveness = jsonFile.responsiveness
        publication.category = jsonFile.category
        return resolve(publication)
      })
      .catch(err => { return reject(new Error(`the package-spm.json is not correct :\n${err}`)) })
    } else {
      return reject(new Error('the package-spm.json is not correct'))
    }
  })
}

/* Parser and checker for package-spm.json */
let parsePackagePromise = (publication) => {
  if (publication.debug) { Debug() }
  return new Promise((resolve, reject) => {
    if (publication.path) {
      checkPackagePromise(publication.jsonFile, publication)
      .then(resolve)
      .catch(reject)
    } else {
      return reject(publication)
    }
  })
}

/* To avoid wasted time, spm requires to specifify the publication name and checks it */
let verifyPackagePromise = (publication) => {
  if (publication.debug) { Debug() }
  return new Promise((resolve, reject) => {
    existsPackagePromise(publication)
    .then(parsePackagePromise)
    .then(resolve)
    .catch(reject)
  })
}

/* Checks custom dom file and attaches it to the publication */
let verifyRefDomPromise = (publication) => {
  if (publication.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Fs.readFile(`${publication.path}/ref-dom.html`, 'utf8', (err, data) => {
      if (err && err.code !== 'ENOENT') {
        return reject(err)
      } else if (err) {
        return reject(new Error('error - reference DOM missing'))
      }
      publication.dom = {type: 'custom', value: data}
      return resolve(publication)
    })
  })
}

/* Basic checks to avoid publication to be immediately rejected by spm registry */
let verifyModulePromise = (publication) => {
  if (publication.debug) { Debug() }
  return new Promise((resolve, reject) => {
    switch (publication.type) {
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

/* Displays the publication and asks the publisher for final confirmation */
let confirmationPublishPromise = (publication) => {
  if (publication.debug) { Debug() }
  return new Promise((resolve, reject) => {
    console.log(`You are about to publish the module ${publication.name}@${publication.version}\nif you have the rights to publish, your contribution will be added in spm registry`)
    Common.promptConfirmation(publication, true, 'Do you confirm this ')
    .then(resolve)
    .catch(reject)
  })
}

/* Auth module - publication requires a spm account and authorization on existing package */
let promptUserPromise = (publication) => {
  if (publication.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Authentify.getSpmAPIToken()
    .then(token => {
      publication.token = token
      return resolve(publication)
    })
    .catch(reject)
  })
}

/* adds in ignoreList specific files from .spmignore list */
let parseIgnoreFiles = (ignoreFiles, publication) => {
  if (publication.debug) { Debug() }
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

/* basic files always ignored */
let updateDefaultIgnoreFiles = (ignores, publication) => {
  if (publication.debug) { Debug() }
  let defaultIgnoreFiles = ['.tmp_sass', 'tmp/', '.gitignore', '.spmignore', 'package-spm.json', 'ref-dom.html']
  for (let ignoreFile of defaultIgnoreFiles) {
    if (!ignores.includes(ignoreFile)) {
      ignores.push(ignoreFile)
    }
  }
  return ignores
}

/* spm embeds a .spmignore file listing files to ignore */
let verifyIgnoredFilesPromise = (publication) => {
  if (publication.debug) { Debug() }
  return new Promise((resolve, reject) => {
    let ignores = parseIgnoreFiles([
      publication.path + '/.gitignore',
      publication.path + '/.spmignore'
    ], publication)
    publication.ignore = updateDefaultIgnoreFiles(ignores, publication)
    return resolve(publication)
  })
}

/* checks if a given selector has a valid scope included inside one of the publication's classes */
let parseSelector = (selector, classes, dependenciesMap) => {
  let item
  if (selector.indexOf(' ') >= 0) {
    let table = selector.split(' ')
    let i = 0
    if (i >= table.length) { return null } else { item = table[i] }
  } else { item = selector }
  let allClasses = classes.concat(Object.keys(dependenciesMap))
  for (let moduleClass of allClasses) {
    let i = item.indexOf('.' + moduleClass)
    if (i >= 0 &&
      ((i + moduleClass.length + 1 === item.length) || [' ', '\n', '\t', '.', '[', '{', '&', ':', ',', ';'].includes(item[i + moduleClass.length + 1]))) {
      return item
    }
  }
  return null
}

/* checks publication can't impact external elements with a larger-scoped selector */
let parseSelectors = (data, classes, dependenciesMap) => {
  let parsed = data.split(',')
  for (let selector of parsed) {
    selector = Common.removeWhitespaces(selector)
    if (!selector.startsWith('@') && !parseSelector(selector, classes, dependenciesMap)) {
      return false
    }
  }
  return true
}

/* high level scope checker for css file */
let checkClass = (file, publication, style = publication.style) => {
  if (publication.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Fs.readFile(file, 'utf8', function (err, data) {
      if (err) { return reject(err) }
      data = Common.cssCleaner(data)
      let startIndex = 0
      let i, j
      let tmpClasses = publication.classes.concat([publication.main]) // .concat(Object.keys(publication.dependenciesClassesMapping))
      while ((i = data.indexOf('@import', startIndex)) >= 0) { startIndex = data.indexOf(';', i) + 1 }
      while (startIndex >= 0 && (i = data.indexOf('@mixin', startIndex)) >= 0) {
        startIndex = data.indexOf('{', i) + 1
        let count = 0
        while (startIndex < data.length &&
          (data[startIndex] !== '}' || count > 0)) {
          if (data[startIndex] === '{') { count++ }
          if (data[startIndex] === '}') { count-- }
          startIndex++
        }
        startIndex++
      }
      while ((i = data.indexOf('{', startIndex)) >= 0) {
        j = data.indexOf('@media', startIndex)
        if (j < 0 || i < j) {
          if (!parseSelectors(data.substring(startIndex, i), tmpClasses, publication.dependenciesClassesMapping) && Common.cleanValue(data.substring(startIndex, i)) !== ':root') {
            return reject(new Error(`incorrect selector found : ${data.substring(startIndex, i)} in ${file}`))
          }
          i = data.indexOf('}', i)
        }
        startIndex = i + 1
      }
      return resolve(publication)
    })
  })
}

/* Information parser from @import tags */
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

/* Checks all import found from the entry file are included in the project */
let recursiveCheckModule = (path, file, publication) => {
  if (publication.debug) { Debug() }
  if (!path.endsWith('/')) { path += '/' }
  publication.ressources.push(path + file)
  return new Promise((resolve, reject) => {
    if (!Fs.existsSync(path + file)) {
      return reject(new Error(`imported file ${path}${file} doesn't exist`))
    } else if (Path.relative(publication.path, path + file).startsWith('..')) {
      // no link should be found to registry since it should link to a symlink in spm_modules/
      return reject(new Error(`imported file ${path}${file} out of project's scope`))
    } else {
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
                  if (resultFile && !resultFile.startsWith('http')) {
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

/* Convert the project to css if needed in order to check selectors' scope */
let scssToCssForCheck = (publication) => {
  if (publication.debug) { Debug() }
  return new Promise((resolve, reject) => {
    if (publication.style === 'scss') {
      Fs.mkdir(`${publication.path}/.tmp_sass`, err => {
        if (err && err.code !== 'EEXIST') { return reject(err) }
        Fs.writeFile(`${publication.path}/.tmp_sass/entry.scss`, `@import '../tmp/${publication.entry}';`, err => {
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
      })
    } else {
      return resolve(publication)
    }
  })
}

/* To confirm the deletion of declared and unused dependencies */
let confirmDependancyRemoval = (publication) => {
  if (publication.debug) { Debug() }
  return new Promise((resolve, reject) => {
    if (Object.keys(publication.removed).length) {
      let questions = [
        {
          type: 'checkbox',
          name: 'keeping',
          message: 'spm has detected the following unused dependancies - which one do you want to keep ?\n',
          choices: Object.keys(publication.removed)
        }
      ]
      Inquirer.prompt(questions)
      .then(answer => {
        let removed = {}
        console.log('pubRemoved', publication.removed)
        console.log('keeping', answer.keeping)
        for (let item in publication.removed) {
          if (!(answer.keeping).includes(item)) {
            removed[item] = publication.dependencies[item]
            delete publication.dependencies[item]
          }
        }
        publication.removed = removed
        return resolve(publication)
      })
      .catch(reject)
    } else {
      return resolve(publication)
    }
  })
}

/* Some dependency can be declared and not used */
let unusedDependancies = (publication) => {
  if (publication.debug) { Debug() }
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
    publication.removed = removed
    confirmDependancyRemoval(publication)
    .then(resolve)
    .catch(reject)
  })
}

/* creates a mapping of all classes related to dependencies object in package.json */
let mapDependenciesClassesPromise = (publication) => {
  if (publication.debug) { Debug() }
  return new Promise((resolve, reject) => {
    publication.dependenciesClassesMapping = {}
    let promises = []
    let promiseList = []
    for (let dependency in publication.dependencies) {
      promises.push(Common.getPackageSpmFilePromise(`${publication.path}/spm_modules/${dependency}/package-spm.json`))
      promiseList.push(dependency)
    }
    Promise.all(promises)
    .then(results => {
      for (let i = 0; i < results.length; i++) {
        if (results[i] === null) {
          delete publication.dependencies[promiseList[i]]
          publication.warnings.push(`dependency ${promiseList[i]} has no package-spm.json - reinstall using --force`)
        } else {
          for (let item of results[i].classes) {
            publication.dependenciesClassesMapping[item.name] = { module: promiseList[i], instance: promiseList[i] }
          }
          for (let instance in publication.dependencies[promiseList[i]].instances) {
            for (let instanceClass in publication.dependencies[promiseList[i]].instances[instance].classes) {
              publication.dependenciesClassesMapping[publication.dependencies[promiseList[i]].instances[instance].classes[instanceClass]] = { module: promiseList[i], instance: instance }
            }
          }
        }
      }
      return resolve(publication)
    })
    .catch(reject)
  })
}

/* deleting the spm_modules from the tmp folder */
let clearspmModulesTmpPromise = (publication) => {
  if (publication.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Common.deleteFolderRecursivePromise(`${publication.path}/tmp/spm_modules`)
    .then(() => { return resolve(publication) })
    .catch(reject)
  })
}

/* Driving the checks -> correct imports & correct dependencies */
let checkModule = (publication) => {
  if (publication.debug) { Debug() }
  return new Promise((resolve, reject) => {
    recursiveCheckModule(publication.path, publication.entry, publication)
    .then(scssToCssForCheck)
    .then(unusedDependancies)
    .then(clearspmModulesTmpPromise)
    .then(resolve)
    .catch(reject)
  })
}

/* recursive directory copier with tmp files logic */
let recursiveDirectoryCopy = (path, directory, ignores, publication) => {
  if (publication.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Fs.mkdir(`${path}/tmp${directory.substring(path.length)}`, err => {
      if (err && err.code !== 'EEXIST') { return reject(err) }
      Fs.readdir(directory, (err, files) => {
        if (err) { return reject(err) }
        if (files.length > 0) {
          let promises = []
          for (let file of files) {
            if (!ignores.includes(file) && !ignores.includes(file + '/')) {
              if (Fs.lstatSync(directory + file).isDirectory()) {
                if (!file.endsWith('/')) { file += '/' }
                let subIgnores = []
                for (let ignore of ignores) {
                  if (ignore.startsWith(file)) {
                    subIgnores.push(ignore.substring(file.length))
                  }
                }
                promises.push(recursiveDirectoryCopy(path, directory + file, subIgnores, publication))
              } else {
                Fs.readFile(directory + file, 'utf8', (err, data) => {
                  if (err) { return reject(err) }
                  promises.push(new Promise((resolve, reject) => {
                    Fs.writeFile(`${path}/tmp${directory.substring(path.length)}${file}`, data, err => {
                      if (err) { return reject(err) }
                      return resolve()
                    })
                  }))
                })
              }
            }
          }
          Promise.all(promises)
          .then(resolve)
          .catch(reject)
        } else { return resolve() }
      })
    })
  })
}

/* initiates the copy folder and the copy functions */
let publicationCopyPromise = (publication) => {
  if (publication.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Fs.mkdir(`${publication.path}/tmp`, err => {
      if (err && err.code !== 'EEXIST') { return reject(err) }
      recursiveDirectoryCopy(publication.path, publication.path + '/', publication.ignore, publication)
      .then(() => { return resolve(publication) })
      .catch(reject)
    })
  })
}

/* tgz creation */
let createTgzPromise = (publication) => {
  if (publication.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Fs.mkdir(`${publication.path}/.tmp`, err => {
      if (err && err.code !== 'EEXIST') { return reject(err) }
      Common.tgzFilePromise(`${publication.path}/tmp`, `${publication.path}/.tmp/${publication.name}.tgz`)
      .then(() => {
        return resolve(publication)
      })
      .catch(reject)
    })
  })
}

/* many folders created during publication preparation - clean-up function */
let cleanUpWorkingDirectory = (publication) => {
  if (publication.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Common.deleteFolderRecursive(`${publication.path}/.sass-cache`, () => {
      Common.deleteFolderRecursive(`${publication.path}/tmp`, () => {
        // error management ?
        Common.deleteFolderRecursive(`${publication.path}/.tmp`, () => {
          // error management ?
          return resolve(publication)
        })
      })
    })
  })
}

/* Prepares payload and sends content to spm registry - handles api replies */
let sendPublicationToRegistryPromise = (publication) => {
  if (publication.debug) { Debug() }
  return new Promise((resolve, reject) => {
    let packageSpm = new PublishPackageSpm(
      publication.name,
      publication.version,
      publication.type,
      publication.style,
      publication.main,
      publication.classes,
      publication.description,
      publication.entry,
      publication.dependencies,
      publication.scripts,
      publication.repository,
      publication.readme,
      publication.keywords,
      publication.engines,
      publication.license,
      publication.dom,
      publication.responsiveness,
      publication.category
    )
    let formData = {}
    formData.package = JSON.stringify(packageSpm)
    if (publication.debug) console.log('package', formData.package)
    formData.module = Fs.createReadStream(`${publication.path}/.tmp/${publication.name}.tgz`)
    // formData.token = publication.token
    Request.put({
      url: CONST.PUBLISH_URL,
      headers: {
        'Authorization': `bearer ${publication.token}`
      },
      formData: formData
    }, function (error, response, body) {
      cleanUpWorkingDirectory(publication)
      .then(() => {
        if (error) { return reject(new Error(`there was an error sending data to spm registry - please try again later or contact our support\n${error}`)) }
        let res = JSON.parse(body)
        if (Math.floor(res.statusCode / 100) >= 4) {
          return reject(new Error(res.message))
        } else {
          if (res.name !== publication.initialName || packageSpm.name) {
            publication.warnings.push(`your package ${publication.initialName || packageSpm.name} has been renamed to ${res.name} by spm registry`)
          }
          publication.successes.push(`${res.name}@${res.version} has been successfully created`)
          return resolve(publication)
        }
      })
      .catch(reject)
    })
  })
}

/* High level publication function -> checks, copies, compresses and sends publication to spm registry */
let publishModulePromise = (publication) => {
  if (publication.debug) { Debug() }
  return new Promise((resolve, reject) => {
    verifyIgnoredFilesPromise(publication)
    .then(mapDependenciesClassesPromise)
    .then(publicationCopyPromise)
    .then(checkModule)
    .then(createTgzPromise)
    .then(promptUserPromise)
    .then(sendPublicationToRegistryPromise)
    .then(resolve)
    .catch(reject)
  })
}

/* Commander for spm publish */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('publish')
    .alias('p')
    .description('to publish your package in the spm registry')
    .arguments('[pkg]')
    .option('-a, --access <access>', 'to specify the authorization level to your module', /^(public|private)$/i, 'public')
    .option('--debug', 'to display debug logs')
    .action((pkg, options) => {
      let publication = new Publish(pkg, options.debug)
      verifyPackagePromise(publication)
      .then(verifyRefDomPromise)
      .then(verifyModulePromise)
      .then(confirmationPublishPromise)
      .then(cleanUpWorkingDirectory)
      .then(publishModulePromise)
      .then(Common.displayMessagesPromise)
      .then(resolve)
      .catch(reject)
    })
    .on('--help', function () {})
  })
}
