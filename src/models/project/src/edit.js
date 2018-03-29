let Prompt = require('inquirer').prompt
let Common = require('../../../lib/common')
let CONST = require('../../../lib/const')
let Debug = require('../../../lib/debug')

/* transforms a list of object's path into a camel case name */
let toCamelCase = (str) => {
  let res = ''
  if (str && str.length) {
    let nameSpace = str.split('*')
    for (let i = nameSpace.length - 1; i >= 0; i--) { res += `${i !== nameSpace.length - 1 ? nameSpace[i][0].toUpperCase() : nameSpace[i][0]}${nameSpace[i].substring(1)}` }
  }
  return res
}

/* function used to prepare the questions used to modify properties */
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

/* parse project json file */
let getProjectJsonPromise = (edit) => {
  if (edit.options.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Common.findProjectJsonPromise(edit.initialPath)
    .then(path => {
      if (!path) { return reject(new Error(CONST.ERROR.SPM_PROJECT_NOT_FOUND)) }
      edit.path = path
      Common.getJsonFilePromise(`${path}/${CONST.PROJECT_JSON_NAME}`)
      .then(json => {
        edit.json = json
        return resolve(edit)
      })
      .catch(reject)
    })
  })
}

/* modify project-spm.json variables */
let modifyVariableJsonPromise = (edit) => {
  if (edit.options.debug) { Debug(edit.options) }
  return new Promise((resolve, reject) => {
    let optionsToChange = {}
    const optionsMap = {
      name: 'name',
      style: 'style',
      htmlName: 'indexFile',
      jsName: 'scriptFile',
      ssName: 'styleFile',
      styleguideName: 'styleguideFile',
      description: 'description',
      jsStandard: 'jsStandard'
    }
    for (let option in optionsMap) {
      if (edit.options[option] && typeof edit.options[option] !== 'function') {
        optionsToChange[option] = edit.options[option]
        edit.successes.push(`project's key ${optionsMap[option]} successfully updated to ${edit.options[option]}`)
      }
    }
    if (Object.keys(optionsToChange).length) {
      edit.json = {
        name: optionsToChange.name || edit.json.name,
        style: optionsToChange.style || edit.json.style,
        type: 'native',
        files: {
          index: optionsToChange.htmlName || edit.json.files.index,
          script: optionsToChange.jsName || edit.json.files.script,
          style: optionsToChange.ssName || edit.json.files.style,
          styleguide: optionsToChange.styleguideName || edit.json.files.styleguide
        },
        description: optionsToChange.description || edit.json.description,
        jsStandard: optionsToChange.jsStandard || edit.json.jsStandard,
        dependencies: edit.json.dependencies
      }
      return resolve(edit)
    } else if (edit.options.dependenciesRm && edit.options.dependenciesRm.length) {
      for (let dependency of edit.options.dependenciesRm) {
        if (edit.json.dependencies[dependency]) {
          delete edit.json.dependencies[dependency]
          edit.successes.push(`dependency ${dependency} successfully removed from project`)
        } else {
          edit.warnings.push(`dependency ${dependency} not found in project - not removed`)
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

/* PROJECT EDIT : to modify a project's general information before publication */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('edit')
    .alias('e')
    .description(`to modify a project's general information before publication`)
    .option('--name <name>', `to configure the project's name`)
    .option('--style <style>', `to configure the project's style`)
    .option('--html-name <htmlFile>', `to configure the project's html file`)
    .option('--js-name <jsFile>', `to configure the project's javascript file`)
    .option('--ss-name <ssFile>', `to configure the project's stylesheet file`)
    .option('--styleguide-name <styleguideFile>', `to configure the project's styleguide file`)
    .option('--description <description>', `to configure the project's description`)
    .option('--jsStandard <standard>', `to configure the project's standard (modular or legacy)`)
    .option('--dependencies-rm <dependencies>', 'to configure the project dependencies', Common.optionList)
    .option('--debug', 'to display debug logs')
    .action(options => {
      let edit = {
        options,
        initialPath: Common.getCurrentPath(),
        successes: [],
        warnings: []
      }
      getProjectJsonPromise(edit)
      .then(modifyVariableJsonPromise)
      .then(res => {
        Common.writeFilePromise(`${edit.path}/${CONST.PROJECT_JSON_NAME}`, JSON.stringify(res.json, null, '  '), {}, true)
        .then(() => {
          Common.displayMessagesPromise(edit)
          .then(resolve)
          .catch(reject)
        })
        .catch(reject)
      })
      .catch(reject)
    })
  })
}
