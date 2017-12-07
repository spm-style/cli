'use strict'
let Fs = require('fs')
let Path = require('path')
let Chalk = require('chalk')
let Inquirer = require('inquirer')
let Use = require('./models').Use
let Common = require('./common')
let CONST = require('./const')

const displayFunc = false

/* converts a string with spaced arguments as an array */
let list = (val) => {
  let res = []
  let table = val.split(',')
  for (let i = 0; i < table.length; i++) {
    table[i] = table[i].split(' ')
    for (let item of table[i]) {
      if (item !== '') {
        res.push(item)
      }
    }
  }
  return res
}

/* ensures there is at least one path existing in the requested options */
let testPathesPromise = (use) => {
  return new Promise((resolve, reject) => {
    if (use.usePathes && use.usePathes.length) {
      for (let item of use.usePathes) {
        if (item.endsWith('.css') || item.endsWith('.scss')) {
          if (Fs.existsSync(`${item.startsWith('/') ? item : use.initialPath + '/' + item}`)) { return resolve(use) }
        }
      }
      return reject(new Error('no file existing'))
    } else { return resolve(use) }
  })
}

/* Checks where package-spm.json file is to define the project's scope */
let findPackagePromise = (use) => {
  return new Promise((resolve, reject) => {
    if (displayFunc) { console.log('> findPackagePromise') }
    if (Path.relative(CONST.USER_DIRECTORY, use.path) === '') { return reject(new Error(CONST.ERROR.OUT_OF_SCOPE)) }
    if (Fs.existsSync(use.path + '/package-spm.json')) {
      use.pathPackage = use.path + '/package-spm.json'
      if (!Fs.existsSync(use.path + '/spm_modules')) {
        return reject(new Error('please install a module before using it'))
      } else {
        use.pathModules = use.path + '/spm_modules'
      }
      if (!use.usePathes || !use.usePathes.length || use.isSave) {
        Common
        .getPackageSpmFilePromise(use.pathPackage)
        .then(res => {
          use.jsonFile = res
          return resolve(use)
        })
        .catch(reject)
      } else { return resolve(use) }
    } else {
      let useBis = Object.assign({}, use)
      useBis.path = use.path.substring(0, use.path.lastIndexOf('/'))
      findPackagePromise(useBis)
      .then(resolve)
      .catch(reject)
    }
  })
}

/* generic list prompter using inquirer */
let promptChoiceInListPromise = (list, message, index = 0) => {
  return new Promise((resolve, reject) => {
    if (!list || !list.length) { return reject(new Error('incorrect list')) }
    let questions = [{
      name: 'res',
      type: 'list',
      message,
      choices: list,
      default: list[index]
    }]
    Inquirer.prompt(questions)
    .then(answer => {
      return resolve(answer.res)
    })
    .catch(reject)
  })
}

/* generates a list of all project's modules and prompts for a choice */
let selectModulePromise = (use) => {
  if (displayFunc) console.log('> selectModulePromise')
  return new Promise((resolve, reject) => {
    Fs.readdir(`${use.pathModules}`, (err, files) => {
      if (err) { return reject(err) }
      use.moduleChoices = []
      for (let file of files) {
        if (Fs.statSync(`${use.pathModules}/${file}`).isDirectory()) { use.moduleChoices.push(file) }
      }
      if (!use.moduleChoices.length) { return reject(new Error('no module found in your project')) }
      if (!use.targetModule) {
        use.modules = use.moduleChoices
        return resolve(use)
      } else if (use.modules.length) {
        if (!use.moduleChoices.includes(use.modules[0])) {
          return reject(new Error(`module ${use.modules[0]} not found`))
        } else {
          return resolve(use)
        }
      } else {
        promptChoiceInListPromise(use.moduleChoices, 'select the targeted module')
        .then(res => {
          use.modules = [res]
          return resolve(use)
        })
        .catch(reject)
      }
    })
  })
}

/* creates a list of all classes in selected modules, opens a list prompt to target them */
let selectClassPromise = (use) => {
  return new Promise((resolve, reject) => {
    if (displayFunc) { console.log('> selectClassPromise') }
    let maxLen = 0
    let tmpModules = []
    let tmpClasses = []
    let promises = []
    for (let module of use.modules) {
      promises.push(Common.getPackageSpmFilePromise(`${use.pathModules}/${module}/package-spm.json`)
      .then(res => {
        let jsonFile = res
        if (!jsonFile) {
          use.warnings.push(`no package-spm.json found in ${module} module - ignored`)
        } else if (!jsonFile.classes || !jsonFile.classes.length) {
          use.warnings.push(`incorrect classes found in ${module} module - ignored`)
        } else {
          for (let item of jsonFile.classes) {
            if (use.classes.length && item.name === use.classes[0]) {
              tmpClasses.push({module, class: item.name, jsonFile})
              if (!tmpModules.includes(module)) { tmpModules.push(module) }
            } else if (!use.classes.length) {
              maxLen = maxLen > module.length ? maxLen : module.length
              tmpClasses.push({module, class: item.name, jsonFile})
              if (!tmpModules.includes(module)) { tmpModules.push(module) }
            }
          }
        }
      }))
    }
    Promise.all(promises)
    .then(() => {
      use.modules = tmpModules
      use.classes = tmpClasses
      if (!use.classes.length) { return reject(new Error(`no class found`)) }
      if (use.targetClass && use.classes.length !== 1) {
        let classChoices = []
        let classMap = {}
        for (let choice of use.classes) {
          let key = `${!use.targetModule ? Chalk.hex('#BB00FF')(choice.module) : ''}${!use.targetModule ? ' > ' : ''}${Chalk.hex('#00FFBB')(choice.class)}`
          classChoices.push(key)
          classMap[key] = choice
        }
        promptChoiceInListPromise(classChoices, `select the targeted class${use.targetModule ? ' in module ' + use.modules[0] : ''}`)
            .then(res => {
              use.classes = [classMap[res]]
              use.modules = [classMap[res].module]
              return resolve(use)
            })
            .catch(reject)
      } else {
        return resolve(use)
      }
    })
    .catch(reject)
  })
}

/* makes a list of a module's detected instances (in dist/) */
let listInstancesInDistPromise = (distPath, module) => {
  return new Promise((resolve, reject) => {
    Fs.readdir(distPath, (err, files) => {
      if (err) { return reject(err) }
      let instances = []
      for (let file of files) {
        // remove extension in future versions ?
        if (file.endsWith('.scss') || file.endsWith('.css')) { instances.push({module, instance: file}) }
      }
      return resolve(instances)
    })
  })
}

/* prompts the user with multichoices checkbox to select instance(s) */
let selectInstancePromise = (use) => {
  return new Promise((resolve, reject) => {
    if (displayFunc) console.log('> selectInstancePromise')
    let promises = []
    for (let module of use.modules) {
      if (Fs.existsSync(`${use.pathModules}/${module}/dist`)) {
        promises.push(listInstancesInDistPromise(`${use.pathModules}/${module}/dist`, module))
      }
    }
    Promise.all(promises)
    .then(res => {
      let tmpInstances = []
      let multiInstance = {}
      for (let table of res) { tmpInstances = tmpInstances.concat(table) }
      if (tmpInstances.length) {
        for (let i = 0; i < tmpInstances.length; i++) {
          // no logic of css or scss separation
          if (use.instances.length && !use.instances.includes(tmpInstances[i].instance.substring(0, tmpInstances[i].instance.lastIndexOf('.')))) {
            tmpInstances.splice(i, 1)
            i--
          } else {
            if (multiInstance[tmpInstances[i].instance]) {
              multiInstance[tmpInstances[i].instance].push(tmpInstances[i])
            } else {
              multiInstance[tmpInstances[i].instance] = [tmpInstances[i]]
            }
          }
        }
        let choices = []
        let instanceMap = {}
        use.pathInstances = {}
        for (let instance in multiInstance) {
          if (multiInstance[instance].length === 1 && use.instances.includes(instance.substring(0, instance.lastIndexOf('.')))) {
            use.pathInstances[`${use.pathModules}/${multiInstance[instance][0].module}/dist/${multiInstance[instance][0].instance}`] = multiInstance[instance][0]
          } else {
            if (use.targetModule || use.modules.length === 1) {
              choices.push(` ${Chalk.hex(CONST.INSTANCE_COLOR)(instance)}`)
              instanceMap[` ${Chalk.hex(CONST.INSTANCE_COLOR)(instance)}`] = {module: multiInstance[instance][0].module, instance}
            } else {
              for (let module of multiInstance[instance]) {
                choices.push(` ${Chalk.hex(CONST.MODULE_COLOR)(module.module)} > ${Chalk.hex(CONST.INSTANCE_COLOR)(instance)}`)
                instanceMap[` ${Chalk.hex(CONST.MODULE_COLOR)(module.module)} > ${Chalk.hex(CONST.INSTANCE_COLOR)(instance)}`] = {module: module.module, instance}
              }
            }
          }
        }
        if (!choices.length && !Object.keys(use.pathInstances).length) { return reject(new Error('no instance has been found')) }
        if (choices.length === 1) {
          use.pathInstances = {}
          use.pathInstances[`${use.pathModules}/${instanceMap[choices[0]].module}/dist/${instanceMap[choices[0]].instance}`] = instanceMap[choices[0]]
          return resolve(use)
        } else if (choices.length) {
          let questions = [{
            name: 'pathInstances',
            type: 'checkbox',
            message: `select the ${Chalk.hex(CONST.INSTANCE_COLOR)('instances')} of ${Chalk.hex(CONST.MODULE_COLOR)(use.targetModule || use.modules.length === 1 ? use.modules[0] : 'modules')} you want to use\n`,
            choices,
            /* the user must at least import one instance */
            validate: (value) => {
              return value.length ? true : Chalk.hex(CONST.WARNING_COLOR)('select at least one instance')
            }
          }]
          Inquirer
          .prompt(questions)
          .then(answer => {
            for (let item of answer.pathInstances) {
              use.pathInstances[`${use.pathModules}/${instanceMap[item].module}/dist/${instanceMap[item].instance}`] = instanceMap[item]
            }
            return resolve(use)
          })
          .catch(reject)
        } else {
          return resolve(use)
        }
      } else {
        return reject(new Error('no instance has been found'))
      }
    })
    .catch(reject)
  })
}

/* function used to generate a full tree of the project used in the checkbox prompter */
let recursiveListPathesPromise = (obj, filePath, use) => {
  return new Promise((resolve, reject) => {
    // avec des path cycliques risque (liens symboliques) => tracker les répertoires && fichiers déjà analysés via Path.relative
    // enlever le fichier de variables ?
    Fs.readdir(filePath, (err, files) => {
      let flag = false
      if (err) { return reject(err) }
      let promises = []
      let subObject = {}
      for (let file of files) {
        if (file.endsWith('.scss') || file.endsWith('.css')) {
          let isEntry = false
          if (use.jsonFile.entry &&
            Fs.existsSync(`${use.path}/${use.jsonFile.entry}`) &&
            Path.relative(`${filePath}/${file}`, `${filePath}/${use.jsonFile.entry}`) === '') { isEntry = true }
          subObject[file] = isEntry ? 'entry' : 'regular'
          flag = true
        }
        if (Fs.statSync(`${filePath}/${file}`).isDirectory() &&
          Path.relative(`${filePath}/${file}`, use.pathModules) !== '' &&
          file !== 'node_modules') {
          subObject[file] = {}
          promises.push(recursiveListPathesPromise(subObject[file], `${filePath}/${file}`, use))
        }
      }
      Promise.all(promises)
      .then(booleans => {
        if (flag || booleans.includes(true)) {
          Object.assign(obj, subObject)
          return resolve(true)
        } else {
          return resolve(false)
        }
      })
      .catch(reject)
    })
  })
}

/* transforms a project tree into formatted + colored choices for prompter */
let recursiveFilesTree = (obj, level, prefix, choices, choiceMap, path) => {
  let folders = []
  for (let file in obj) {
    if (obj[file] === 'regular' || obj[file] === 'entry') {
      let fullFile = Chalk.hex(obj[file] === 'entry' ? CONST.SUCCESS_COLOR : CONST.PROJECT_COLOR)(`${file}${obj[file] === 'entry' ? ' (entry)' : ''}`)
      choices.push(`${Chalk.hex('#717171')(prefix + '|  ')}${fullFile}`)
      choiceMap[`${Chalk.hex('#717171')(prefix + '|  ')}${fullFile}`] = {full: `${path}/${file}`, short: file}
    } else if (obj[file] !== null && typeof obj[file] === 'object' && Object.keys(obj[file]).length) { folders.push(file) }
  }
  for (let i = 0; i < folders.length; i++) {
    choices.push(new Inquirer.Separator(`  ${prefix}|_ ${folders[i]}/`))
    recursiveFilesTree(obj[folders[i]], level + 1, prefix + (i !== folders.length - 1 ? '|  ' : '   '), choices, choiceMap, `${path}/${folders[i]}`)
  }
}

/* opens a prompt to select the path where the instance must be imported */
let createFilesChoicesPromise = (use) => {
  return new Promise((resolve, reject) => {
    use.choiceMap = {}
    let choices = [new Inquirer.Separator(use.path)]
    recursiveFilesTree(use.filesTree, 0, '', choices, use.choiceMap, use.path)
    let questions = [{
      name: 'files',
      type: 'checkbox',
      choices,
      message: 'select the files you want to use the instances in',
      /* the user must at least import one instance */
      validate: (value) => {
        return value.length ? true : Chalk.hex(CONST.WARNING_COLOR)('select at least one instance')
      }
    }]
    if (!choices.length) { return reject(new Error('no css or scss file found')) }
    if (choices.length === 1) {
      use.usePathes = {}
      use.usePathes[use.choiceMap[choices[0]].full] = use.choiceMap[choices[0]].short
      return resolve(use)
    }
    Inquirer.prompt(questions)
    .then(answer => {
      use.usePathes = {}
      for (let file of answer.files) { use.usePathes[use.choiceMap[file].full] = use.choiceMap[file].short }
      return resolve(use)
    })
    .catch(reject)
  })
}

/* initiates the project's files search */
let selectTargetFilesPromise = (use) => {
  if (displayFunc) console.log('> selectTargetFilesPromise')
  return new Promise((resolve, reject) => {
    if (!use.usePathes && use.jsonFile.entry) {
      // cas avec seulement le entry
      use.usePathes = {}
      use.usePathes[`${use.path}/${use.jsonFile.entry}`] = use.jsonFile.entry
      return resolve(use)
    } else if (use.usePathes.length) {
      // cas avec un liste d'argument
      let tmpUsePathes = {}
      for (let item of use.usePathes) {
        if (item.startsWith('./')) {
          tmpUsePathes[`${use.initialPath}/${item.substring(2)}`] = item.substring(2)
        } else if (item.startsWith('../')) {
          tmpUsePathes[`${use.initialPath}/${item}`] = item
        } else {
          tmpUsePathes[item] = item
        }
      }
      use.usePathes = tmpUsePathes
      return resolve(use)
    } else {
      use.filesTree = {}
      // create arborescence
      recursiveListPathesPromise(use.filesTree, use.path, use)
      // display arborescence in checkbox choice
      .then(res => { return createFilesChoicesPromise(use) })
      .then(resolve)
      .catch(reject)
    }
  })
}

/* returns the module package as json object */
let detectModulePackage = (module, use) => {
  return new Promise((resolve, reject) => {
    if (!Fs.existsSync(`${use.pathModules}/${module}/package-spm.json`)) {
      return reject(new Error(`module ${module} has no package-spm.json - reinstall using -f option`))
    }
    Common.getPackageSpmFilePromise(`${use.pathModules}/${module}/package-spm.json`)
    .then(resolve)
    .catch(reject)
  })
}

/* returns the instance updated variable and updated classes - only for scss instances */
let detectInstanceParameters = (instance, use) => {
  return new Promise((resolve, reject) => {
    let content = use.pathSavedInstances[instance]
    if (!Fs.existsSync(`${use.pathModules}/${content.module}/${use.modulesMap[content.module].entry}`)) {
      return reject(new Error(`couldn't save ${content.instance} from module ${content.module} - missing entry file`))
    }
    if (instance.endsWith('.css') && !Fs.existsSync(`${use.pathModules}/${content.module}/dist/src/${content.instance.slice(0, -4)}.scss`)) {
      return reject(new Error(`couldn't save ${content.instance} from module ${content.module} - missing scss src file`))
    }
    let result = { module: content.module, name: content.instance, instance: {} }
    let classesList = []
    let variablesList = []
    let variablesMap = {}
    for (let item of use.modulesMap[content.module].classes) {
      classesList.push(item.name)
      for (let variableItem of item.variables) {
        variablesMap[variableItem.name] = variableItem.value
      }
    }
    Fs.readFile(`${use.pathModules}/${content.module}/${use.modulesMap[content.module].entry}`, 'utf8', (err1, data1) => {
      if (err1) { return reject(err1) }
      let i = data1.indexOf('@mixin spm-')
      i = data1.indexOf('(', i)
      let j = data1.indexOf(')', i)
      for (let parameter of data1.substring(i + 1, j).split(',')) {
        parameter = Common.removeWhitespaces(parameter)
        if (parameter.startsWith('$local-')) {
          variablesList.push(parameter.substring(7))
        } else if (!parameter.startsWith('$mixin-local-')) {
          return reject(new Error(`wrong parameter ${parameter} in module entry point file`))
        }
      }
      Fs.readFile(`${use.pathModules}/${content.module}/dist/${content.instance.endsWith('.css') ? 'src/' : ''}${content.instance.substring(0, content.instance.lastIndexOf('.'))}.scss`, 'utf8', (err2, data2) => {
        if (err2) { return reject(err2) }
        i = data2.indexOf('(', data2.indexOf('@include spm-'))
        let parameters = data2.substring(i + 1, data2.indexOf(')', i)).split(',')
        for (let index = 0; index < variablesList.length; index++) {
          if (variablesMap[variablesList[index]] !== parameters[index]) {
            if (!result.instance.variables) { result.instance.variables = {} }
            result.instance.variables[variablesList[index]] = parameters[index]
          }
        }
        for (let index = 0; index < classesList.length; index++) {
          if (classesList[index] !== `'${parameters[variablesList.length + index]}'`) {
            if (!result.instance.classes) { result.instance.classes = {} }
            result.instance.classes[classesList[index]] = parameters[variablesList.length + index]
          }
        }
        return resolve(result)
      })
    })
  })
}

/* Adds instances in package-spm.json if flag --save */
let updateInstanceDependenciesPromise = (use) => {
  if (displayFunc) console.log('> updateInstanceDependenciesPromise')
  return new Promise((resolve, reject) => {
    if (!use.isSave) {
      return resolve(use)
    }
    if (!use.jsonFile) {
      use.warnings.push(`instance not saved - missing package-spm.json - use spm init`)
      return resolve(use)
    }
    let modulesPromises = []
    let instancesPromises = []
    for (let module of use.modules) {
      modulesPromises.push(detectModulePackage(module, use))
    }
    Promise.all(modulesPromises)
    .then(modulesPackages => {
      use.modulesMap = {}
      for (let i = 0; i < use.modules.length; i++) {
        use.modulesMap[use.modules[i]] = modulesPackages[i]
      }
      for (let instance in use.pathSavedInstances) {
        instancesPromises.push(detectInstanceParameters(instance, use))
      }
      Promise.all(instancesPromises)
      .then(instancesParameters => {
        for (let instance of instancesParameters) {
          if (!use.jsonFile.dependencies) { use.jsonFile.dependencies = {} }
          if (!use.jsonFile.dependencies[instance.module]) {
            use.jsonFile.dependencies[instance.module] = { version: use.modulesMap[instance.module].version, instances: {} }
          }
          if (!use.jsonFile.dependencies[instance.module].instances) { use.jsonFile.dependencies[instance.module].instances = {} }
          if (!use.jsonFile.dependencies[instance.module].instances[instance.name] || use.isForce) {
            use.jsonFile.dependencies[instance.module].instances[instance.name] = instance.instance
            if (use.isForce) {
              use.warnings.push(`instance ${instance.name} of module ${instance.module} replaced in project's dependencies with --force`)
            } else {
              use.successes.push(`instance ${instance.name} of module ${instance.module} added in project's dependencies`)
            }
          } else {
            use.warnings.push(`instance ${instance.name} of module ${instance.module} already in project's dependencies`)
          }
        }
        Common.writeContent(JSON.stringify(use.jsonFile, null, '  ') + '\n', use.pathPackage, '', use)
        .then(resolve)
        .catch(reject)
      })
      .catch(reject)
    })
    .catch(reject)
  })
}

/* Only list modules where the instance has been found for 'spm u myInstance -m' ? */

/* Command line for spm use */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('use')
    .alias('u')
    .description('to use a style instance you have already generated')
    .arguments('[instances...]')
    .option('-p, --path [files]', 'where the style will be imported', list)
    .option('-s, --save', `to save the instance in your project's package-spm.json`)
    .option('-m, --module [module]', `to target specific module's instances`)
    .option('-f, --force', `to force the package-spm.json's update`)
    // .option("-C, --class [class]", `to target specific class' instances`) ==> not in v1
    .action((instances, options) => {
      let use = new Use(instances, options, Common.getCurrentPath())
      testPathesPromise(use)
      .then(findPackagePromise)
      .then(selectModulePromise)
      .then(selectClassPromise)
      .then(selectInstancePromise)
      .then(selectTargetFilesPromise)
      .then(Common.updateUsedFilesPromise)
      .then(updateInstanceDependenciesPromise)
      .then(Common.displayMessagesPromise)
      .then(resolve)
      .catch(reject)
    })
    .on('--help', function () {
    })
  })
}
