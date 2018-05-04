let Path = require('path')
let Chalk = require('chalk')
let Prompt = require('inquirer').prompt
let Preferences = require('preferences')
let Common = require('../../../lib/common')
let CONST = require('../../../lib/const')
let Debug = require('../../../lib/debug')

/* Detect if in the scope of a project */
let testProjectScopePromise = (edit) => {
  if (edit.options.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Common.findProjectJsonPromise(edit.initialPath)
    .then(path => {
      edit.projectPath = path
      return resolve(edit)
    })
    .catch(reject)
  })
}

/* parse project json file */
let getModuleJsonPromise = (edit) => {
  if (edit.options.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Common.findModuleJsonPromise(edit.initialPath)
    .then(path => {
      if (!path) { return reject(new Error(CONST.ERROR.SPM_MODULE_NOT_FOUND)) }
      edit.path = path
      Common.getJsonFilePromise(Path.join(path, CONST.MODULE_JSON_NAME))
      .then(json => {
        edit.json = json
        return resolve(edit)
      })
      .catch(reject)
    })
  })
}

/* transforms a list of object's path into a camel case name */
let toCamelCase = (str) => {
  let res = ''
  if (str && str.length) {
    let nameSpace = str.split('*')
    for (let i = nameSpace.length - 1; i >= 0; i--) { res += `${i !== nameSpace.length - 1 ? nameSpace[i][0].toUpperCase() : nameSpace[i][0]}${nameSpace[i].substring(1)}` }
  }
  return res
}

/* prepares the question object used to ask for modifications */
let recursivePropertiesAdderPromise = (obj, table = [], path = '') => {
  return new Promise((resolve, reject) => {
    let promises = []
    if (!Object.keys(obj).length) { return resolve(table) }
    for (let key in obj) {
      if (typeof obj[key] === 'object') {
        promises.push(recursivePropertiesAdderPromise(obj[key], table, path.length ? `${path}*${key}` : key))
      } else {
        let valuePath = path.length ? `${path}*${key}` : key
        let question = { name: valuePath, message: toCamelCase(valuePath), default: obj[key] instanceof Array ? obj[key].join(', ') : obj[key] }
        if (obj[key] instanceof Array) { question.filter = Common.optionList }
        promises.push(question)
      }
    }
    Promise.all(promises)
    .then(newTable => {
      let result = []
      for (let item of newTable) { result = result.concat(item) }
      return resolve(result)
    })
    .catch(reject)
  })
}

/* to add only new elements in a list */
let updateList = (newList, oldList) => {
  if (!newList) { return oldList }
  if (!oldList) { oldList = [] }
  for (let item of newList) {
    if (!oldList.includes(item)) { oldList.push(item) }
  }
  return oldList
}

/* to modify variables - entry point function */
let modifyVariableJsonPromise = (edit) => {
  if (edit.options.debug) { Debug(edit.options.description === '') }
  return new Promise((resolve, reject) => {
    let optionsToChange = {}
    const optionsMap = {
      name: 'name',
      version: 'version',
      style: 'style',
      mainClass: 'mainClass',
      description: 'description',
      jsStandard: 'jsStandard',
      category: 'category',
      responsive: 'responsive',
      keywords: 'keywords',
      htmlName: 'indexFile',
      jsName: 'scriptFile',
      ssName: 'styleFile',
      classes: 'classes',
      sandboxDefaultClasses: 'sandboxDefaultClasses',
      readme: 'readme',
      repository: 'repository',
      license: 'license'
    }
    for (let option in optionsMap) {
      if (edit.options[option] && typeof edit.options[option] !== 'function') {
        optionsToChange[option] = edit.options[option]
        edit.successes.push(`module's key ${optionsMap[option]} successfully updated to ${edit.options[option]}`)
      }
    }
    if (Object.keys(optionsToChange).length) {
      edit.json = {
        name: optionsToChange.name || edit.json.name,
        version: optionsToChange.version || edit.json.version,
        author: edit.json.author || new Preferences(CONST.PREFERENCES).user,
        style: optionsToChange.style || edit.json.style,
        type: 'native',
        mainClass: optionsToChange.mainClass || edit.json.mainClass,
        description: optionsToChange.description || edit.json.description,
        jsStandard: optionsToChange.jsStandard || edit.json.jsStandard,
        category: optionsToChange.category || edit.json.category,
        responsive: optionsToChange.responsive || edit.json.responsive,
        keywords: optionsToChange.keywords || edit.json.keywords,
        dependencies: edit.json.dependencies,
        files: {
          index: optionsToChange.htmlName || edit.json.files.index,
          script: optionsToChange.jsName || edit.json.files.script,
          style: optionsToChange.ssName || edit.json.files.style
        },
        classes: updateList(optionsToChange.classes, edit.json.classes),
        sandbox: { defaultClasses: updateList(optionsToChange.sandboxDefaultClasses, edit.json.sandboxDefaultClasses) },
        readme: optionsToChange.readme || edit.json.readme,
        repository: optionsToChange.repository || edit.json.repository,
        license: optionsToChange.license || edit.json.license,
        contributors: edit.json.contributors
      }
      return resolve(edit)
    } else if (edit.options.dependenciesRm && edit.options.dependenciesRm.length) {
      for (let dependency of edit.options.dependenciesRm) {
        if (edit.json.dependencies[dependency]) {
          delete edit.json.dependencies[dependency]
          edit.successes.push(`dependency ${dependency} successfully removed from module`)
        } else {
          edit.warnings.push(`dependency ${dependency} not found in module - not removed`)
        }
      }
      return resolve(edit)
    } else {
      recursivePropertiesAdderPromise(edit.json)
      .then(questions => {
        Prompt(questions)
        .then(answer => {
          for (let key in answer) {
            let obj = edit.json
            let keySplit = key.split('*')
            for (let i = 0; i < keySplit.length; i++) {
              if (i === keySplit.length - 1) {
                if (obj[keySplit[i]] !== answer[key]) {
                  obj[keySplit[i]] = answer[key]
                  edit.successes.push(`project's key ${toCamelCase(key)} successfully updated to ${answer[key]}`)
                }
              } else {
                obj = obj[keySplit[i]]
              }
            }
          }
          return resolve(edit)
        })
        .catch(reject)
      })
      .catch(reject)
    }
  })
}

/* MODULE EDIT : to modify general information about a module before publication */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('edit')
    .alias('e')
    .description(`to modify general information about a module before publication`)
    .option('--name <name>', `to configure the module's name`)
    .option('--version <version>', `to configure the module's version`)
    .option('--style <style>', `to configure the module's style`)
    .option('--main-class <mainClass>', `to configure the module's main class`)
    .option('--description <description>', `to configure the module's description`)
    .option('--js-standard <standard>', `to configure the module's javascript standard`)
    .option('--category <category>', `to configure the modules's category`)
    .option('--responsive <devices>', `to configure the modules's devices`, Common.optionList)
    .option('--keywords <keywords>', `to configure the module's keywords`, Common.optionList)
    .option('--dependencies-rm <dependencies>', 'to configure the module dependencies', Common.optionList)
    .option('--html-name <htmlFile>', `to configure the module's html file`)
    .option('--js-name <jsFile>', `to configure the module's javascript file`)
    .option('--ss-name <ssFile>', `to configure the module's stylesheet file`)
    .option('--classes <classes>', `to configure the module's classes`, Common.optionList)
    .option('--sandbox-default-classes <classes>', `to configure the active classes by default for sandbox`, Common.optionList)
    .option('--readme <readmeFile>', `to configure the module's README.md file`)
    .option('--repository <repository>', `to configure the module's repository`)
    .option('--license <license>', `to configure the module's license`)
    .option('--debug', 'to display debug logs')
    .action(options => {
      if (options.name && typeof options.name !== 'function' && (!/^.{2,}$/.test(options.name) || !/^[a-zA-Z0-9_]*$/.test(options.name))) {
        Program.on('--help', () => { console.log(Chalk.hex(CONST.WARNING_COLOR)('name should be longer than 2 characters, only alphanumerical')) })
        Program.help()
        return reject(new Error('name should be longer than 2 characters, only alphnumerical'))
      } else if (options.mainClass && (!/^.{2,}$/.test(options.mainClass) || !/^[a-zA-Z0-9_]*$/.test(options.mainClass))) {
        Program.on('--help', () => { console.log(Chalk.hex(CONST.WARNING_COLOR)('main class should be longer than 2 characters, only alphanumerical')) })
        Program.help()
      } else if (options.version && typeof options.version !== 'function' && !/^[0-9]+[.][0-9]+[.][0-9]+$/.test(options.version)) {
        Program.on('--help', () => { console.log(Chalk.hex(CONST.WARNING_COLOR)('please enter a valid version number (x.x.x)')) })
        Program.help()
      } else if (options.responsive && !Common.checkCorrectResponsiveness(options.responsive)) {
        Program.on('--help', () => { console.log(Chalk.hex(CONST.WARNING_COLOR)('authorized responsive values: watch, mobile, phablet, tablet, laptop, screenXl')) })
        Program.help()
      } else if (options.jsStandard && !['legacy', 'modular'].includes(options.jsStandard)) {
        Program.on('--help', () => { console.log(Chalk.hex(CONST.WARNING_COLOR)('authorized javascript standard: modular or legacy')) })
        Program.help()
      } else {
        let edit = {
          options,
          initialPath: Common.getCurrentPath(),
          successes: [],
          warnings: []
        }
        testProjectScopePromise(edit)
        .then(getModuleJsonPromise)
        .then(modifyVariableJsonPromise)
        .then(res => {
          Common.writeFilePromise(Path.join(edit.path, CONST.MODULE_JSON_NAME), JSON.stringify(res.json, null, '  '), {}, true)
          .then(() => {
            Common.displayMessagesPromise(edit)
            .then(resolve)
            .catch(reject)
          })
          .catch(reject)
        })
        .catch(reject)
      }
    })
  })
}
