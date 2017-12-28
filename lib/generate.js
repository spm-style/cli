'use strict'
let Fs = require('fs')
let Chalk = require('chalk')
let Prompt = require('inquirer').prompt
let Generate = require('./models').Generate
let Common = require('./common')
let CONST = require('./const')
let Debug = require('./debug')

/* Checks where package-spm.json file is to define the project's scope */
let findPackagePromise = (generate) => {
  if (generate.debug) { Debug() }
  return new Promise((resolve, reject) => {
    if (generate.path.indexOf(CONST.USER_DIRECTORY) === -1) { return reject(CONST.ERROR.OUT_OF_SCOPE) }
    while (generate.path !== CONST.USER_DIRECTORY) {
      if (Fs.existsSync(generate.path + '/package-spm.json')) {
        generate.pathPackage = generate.path + '/package-spm.json'
        if (!Fs.existsSync(generate.path + '/spm_modules')) {
          return reject(new Error('please install a module before using it'))
        } else {
          generate.pathModules = generate.path + '/spm_modules'
        }
        if (Fs.existsSync(generate.path + '/variables-spm.scss')) {
          generate.pathVariables = generate.path + '/variables-spm.scss'
        } else {
          return reject(new Error('no variables-spm.scss file found - '))
        }
        return resolve(generate)
      } else if (Fs.existsSync(`${generate.path}/spm_modules`)) {
        generate.pathModules = `${generate.path}/spm_modules`
        return resolve(generate)
      }
      generate.path = generate.path.substring(0, generate.path.lastIndexOf('/'))
    }
    return reject(new Error(CONST.ERROR.OUT_OF_SCOPE))
  })
}

/* parses the project's jsonFile if instance must be saved */
let parsePackagePromise = (generate) => {
  if (generate.debug) { Debug() }
  return new Promise((resolve, reject) => {
    if (!generate.isSave) {
      return resolve(generate)
    }
    Common.getPackageSpmFilePromise(generate.pathPackage)
    .then(res => {
      if (!res) {
        generate.warnings.push(`instance not saved - missing package-spm.json - use spm init`)
      } else {
        generate.projectJsonFile = res
        if (res.style === 'scss') {
          generate.style = 'scss'
          generate.warnings.push(`default style has been set as scss according to project's package-spm.json`)
        }
      }
      return resolve(generate)
    })
    .catch(reject)
  })
}

/* generic function for list prompter */
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
    Prompt(questions)
    .then(answer => {
      return resolve(answer.res)
    })
    .catch(reject)
  })
}

/* To define the targeted module(s) */
let selectModulePromise = (generate) => {
  if (generate.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Fs.readdir(`${generate.pathModules}`, (err, files) => {
      if (err) { return reject(err) }
      generate.moduleChoices = []
      for (let file of files) {
        if (Fs.statSync(`${generate.pathModules}/${file}`).isDirectory()) { generate.moduleChoices.push(file) }
      }
      if (!generate.moduleChoices.length) { return reject(new Error('no module found in your project')) }
      if (!generate.classTarget) {
        if (generate.name) {
          if (!generate.moduleChoices.includes(generate.name)) {
            return reject(new Error(`module ${generate.name} not found, please install it with "spm install ${generate.name}"`))
          } else {
            generate.moduleName = generate.name
            return resolve(generate)
          }
        } else {
          promptChoiceInListPromise(generate.moduleChoices, 'select the targeted module')
          .then(res => {
            generate.moduleName = res
            return resolve(generate)
          })
          .catch(reject)
        }
      } else {
        return resolve(generate)
      }
    })
  })
}

/* lists all classes used in the targeted module */
let listAllClassesPromise = (generate, module) => {
  if (generate.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Common.getPackageSpmFilePromise(`${generate.pathModules}/${module}/package-spm.json`)
    .then(jsonFile => {
      if (!jsonFile) { return reject(new Error(`issue targeting package.json of module ${module}`)) }
      for (let item of jsonFile.classes) {
        if (!generate.name || generate.name === item.name) {
          generate.classChoice.push({module, class: item.name, jsonFile})
          generate.maxLen = generate.maxLen < module.length ? module.length : generate.maxLen
        }
      }
      return resolve()
    })
    .catch(reject)
  })
}

/* To define the targeted class */
let selectClassPromise = (generate) => {
  if (generate.debug) { Debug() }
  return new Promise((resolve, reject) => {
    if (!generate.classTarget) {
      Common.getPackageSpmFilePromise(`${generate.pathModules}/${generate.moduleName}/package-spm.json`)
      .then(res => {
        if (!res) { return reject(new Error(`issue targeting package-spm.json of module ${generate.moduleName}`)) }
        generate.jsonFile = res
        if (!generate.jsonFile.classes.length) { return reject(new Error(`issue in module ${generate.moduleName}: no class found`)) }
        for (let item of generate.jsonFile.classes) { item.checked = generate.nickname !== false }
        return resolve(generate)
      })
      .catch(reject)
    } else {
      generate.classChoice = []
      generate.maxLen = 0
      let promises = []
      for (let module of generate.moduleChoices) {
        promises.push(listAllClassesPromise(generate, module))
      }
      Promise.all(promises)
      .then(res => {
        switch (generate.classChoice.length) {
          case 0:
            return reject(new Error(`no class found`))
          case 1:
            generate.jsonFile = generate.classChoice[0].jsonFile
            generate.moduleName = generate.classChoice[0].module
            for (let item of generate.jsonFile.classes) {
              if (item.name === generate.classChoice[0].class) { item.checked = generate.nickname !== false } else { item.checked = false }
            }
            return resolve(generate)
          default:
            let classList = []
            let classListMapping = {}
            for (let choice of generate.classChoice) {
              let display = `${Chalk.hex(CONST.MODULE_COLOR)(choice.module)}${Array(generate.maxLen - choice.module.length + 1).join(' ')} > ${Chalk.hex(CONST.CLASS_COLOR)(choice.class)}`
              classList.push(display)
              classListMapping[display] = choice
            }
            promptChoiceInListPromise(classList, 'select the targeted class')
            .then(res => {
              generate.jsonFile = classListMapping[res].jsonFile
              generate.moduleName = classListMapping[res].module
              for (let item of generate.jsonFile.classes) {
                if (item.name === classListMapping[res].class) { item.checked = generate.nickname !== false } else { item.checked = false }
              }
              return resolve(generate)
            })
            .catch(reject)
        }
      })
      .catch(reject)
    }
  })
}

/* Checks if the potential file containing the new instance isn't alreay existing */
let checkInstanceAvailablePromise = (generate) => {
  if (generate.debug) { Debug() }
  return new Promise((resolve, reject) => {
    if (!generate.nickname) {
      generate.nickname = generate.jsonFile.name
    }
    generate.pathInstance = `${generate.pathModules}/${generate.moduleName}/dist/${generate.nickname}.${generate.style}`
    if (generate.isForce) {
      Fs.unlink(generate.pathInstance, err => {
        if (err && err.code !== 'ENOENT') { return reject(err) }
        return resolve(generate)
      })
    } else if (Fs.existsSync(generate.pathInstance)) {
      return reject(new Error(`${generate.nickname} instance already exists in module ${generate.moduleName} - use option -f to force`))
    } else {
      return resolve(generate)
    }
  })
}

/* replaces a prefix by another one -> Common ? */
let replacePrefix = (str, oldPrefix, newPrefix) => {
  if (!str.startsWith(oldPrefix)) { return str } else { return `${newPrefix}${str.substring(oldPrefix.length)}` }
}

/* lists, prompts and customizes variables values and names */
let customizeVariablesPromise = (generate) => {
  if (generate.debug) { Debug() }
  return new Promise((resolve, reject) => {
    generate.variablesMap = {}
    generate.nicknames = {}
    for (let item of generate.jsonFile.classes) {
      // item.checked before here in if condition
      if (item.variables) {
        for (let variable of item.variables) {
          generate.variablesMap[variable.name] = {from: variable.value}
        }
        generate.nicknames[item.name] = true
      }
    }
    let questions = []
    for (let variable in generate.variablesMap) {
      questions.push({
        name: variable,
        message: `value of ${variable}`,
        default: generate.variablesMap[variable].from
      })
    }
    if (!questions.length) { return resolve(generate) }
    Prompt(questions)
    .then(answer => {
      for (let variable in generate.variablesMap) {
        generate.variablesMap[variable].to = answer[variable]
      }
      let nicknamesQuestions = []
      if (generate.rename) {
        for (let nickname in generate.nicknames) {
          nicknamesQuestions.push({
            name: nickname,
            message: `instance name to replace ${nickname}`,
            default: replacePrefix(nickname, generate.jsonFile.name, generate.nickname)
          })
        }
      } else {
        for (let className in generate.nicknames) {
          generate.nicknames[className] = replacePrefix(className, generate.jsonFile.name, generate.nickname)
        }
        return resolve(generate)
      }
      if (!nicknamesQuestions.length) { return resolve(generate) }
      Prompt(nicknamesQuestions)
      .then(answer => {
        for (let className in generate.nicknames) {
          generate.nicknames[className] = answer[className] || replacePrefix(className, generate.jsonFile.name, generate.nickname)
        }
        return resolve(generate)
      })
      .catch(reject)
    })
  })
}

/* ensures the dist directory does exist */
let distCreationPromise = (generate) => {
  if (generate.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Fs.mkdir(`${generate.pathModules}/${generate.moduleName}/dist`, err => {
      if (err && err.code !== 'EEXIST') { return reject(err) }
      return resolve(generate)
    })
  })
}

/* determines the parameters order, replaces customized variables with new value and generates the new file */
let instanceCreationPromise = (generate) => {
  if (generate.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Fs.readFile(`${generate.pathModules}/${generate.moduleName}/${generate.jsonFile.entry}`, 'utf8', (err, data) => {
      try {
        if (err) { return reject(err) }
        let parameters = ''
        let i = data.indexOf('@mixin spm-')
        i = data.indexOf('(', i)
        let j = data.indexOf(')', i)
        for (let parameter of data.substring(i + 1, j).split(',')) {
          parameter = Common.removeWhitespaces(parameter)
          if (parameter.startsWith('$local-')) {
            if (!generate.variablesMap[parameter.substring(7)]) { generate.variablesMap[parameter.substring(7)] = `$_${parameter.substring(7)}` }
            parameters += `${generate.variablesMap[parameter.substring(7)].to || generate.variablesMap[parameter.substring(7)].from},`
          } else if (parameter.startsWith('$mixin-local-')) {
            parameters += `'${generate.nicknames[parameter.substring(13)]}',`
          } else {
            return reject(new Error(`wrong parameter ${parameter} in module entry point file`))
          }
        }
        if (parameters.endsWith(',')) { parameters = parameters.slice(0, -1) }
        if (generate.style === 'css') { Common.createFolderIfUnexistantSync(`${generate.pathModules}/${generate.moduleName}/dist/src`) }
        let output = `@import "../variables-spm.scss";\n@import "../${generate.jsonFile.entry}";\n\n`
        output += `@include spm-${generate.jsonFile.main}-class(${parameters});\n`
        Fs.writeFile(`${generate.pathModules}/${generate.moduleName}/dist/${generate.nickname}.scss`, output, err => {
          if (err) { return reject(err) }
          if (generate.style === 'css') {
            Common.convertScssToCss(generate, `${generate.pathModules}/${generate.moduleName}/dist/`, generate.nickname)
            .then(res => {
              generate.successes.push(`instance ${generate.nickname}.css of module ${generate.moduleName} has been generated`)
              return resolve(generate)
            })
            .catch(reject)
          } else {
            generate.successes.push(`instance ${generate.nickname}.scss of module ${generate.moduleName} has been generated`)
            return resolve(generate)
          }
        })
      } catch (err) { return reject(err) }
    })
  })
}

/* adds imports in files using the new instance(s) */
let updateUsedFiles = (generate) => {
  if (generate.debug) { Debug() }
  return new Promise((resolve, reject) => {
    if (!generate.use) { return resolve(generate) }
    generate.pathInstances = {}
    generate.pathInstances[generate.pathInstance] = {
      module: generate.moduleName,
      instance: generate.nickname
    }
    generate.usePathes = {}
    if (generate.use === true) {
      generate.usePathes[`./${generate.jsonFile.entry}`] = generate.jsonFile.entry
    } else {
      for (let tmpPath of generate.use.split(' ')) {
        generate.usePathes[tmpPath] = tmpPath
      }
    }
    Common.updateUsedFilesPromise(generate)
    .then(resolve)
    .catch(reject)
  })
}

/* Adds instances in package-spm.json if flag --save */
let updateInstanceDependenciesPromise = (generate) => {
  if (generate.debug) { Debug() }
  return new Promise((resolve, reject) => {
    if (!generate.isSave || !generate.projectJsonFile) {
      return resolve(generate)
    }
    if (!generate.projectJsonFile.dependencies) {
      generate.projectJsonFile.dependencies = {}
    }
    if (!generate.projectJsonFile.dependencies[generate.moduleName]) {
      generate.projectJsonFile.dependencies[generate.moduleName] = {
        version: generate.jsonFile.version,
        instances: {}
      }
    }
    if (!generate.projectJsonFile.dependencies[generate.moduleName].instances) {
      generate.projectJsonFile.dependencies[generate.moduleName].instances = {}
    }
    generate.projectJsonFile.dependencies[generate.moduleName].instances[generate.nickname] = {}
    for (let item in generate.variablesMap) {
      if (generate.variablesMap[item].from !== generate.variablesMap[item].to) {
        if (!generate.projectJsonFile.dependencies[generate.moduleName].instances[generate.nickname].variables) {
          generate.projectJsonFile.dependencies[generate.moduleName].instances[generate.nickname].variables = {}
        }
        generate.projectJsonFile.dependencies[generate.moduleName].instances[generate.nickname].variables[item] = generate.variablesMap[item].to
      }
    }
    for (let item in generate.nicknames) {
      if (item !== generate.nicknames[item]) {
        if (!generate.projectJsonFile.dependencies[generate.moduleName].instances[generate.nickname].classes) {
          generate.projectJsonFile.dependencies[generate.moduleName].instances[generate.nickname].classes = {}
        }
        generate.projectJsonFile.dependencies[generate.moduleName].instances[generate.nickname].classes[item] = generate.nicknames[item]
      }
    }
    generate.successes.push(`instance ${generate.nickname} of module ${generate.moduleName} added in project's dependencies`)
    Common.writeContent(JSON.stringify(generate.projectJsonFile, null, '  ') + '\n', generate.pathPackage, '', generate)
    .then(resolve)
    .catch(reject)
  })
}

/* Commander for spm generate */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('generate')
    .alias('g')
    .description('to generate a customized instance of a spm module')
    .arguments('[name] [nickname]')
    .option('-r, --rename', `to modify all classes' names`)
    .option('-s, --save', `to save the instance in your project's package-spm.json`)
    .option('--scss', `if you use scss preprocessing language, css by default`)
    .option('-u, --use [path]', 'to use the generated instance in your project')
    .option('-f, --force', 'to force to write the requested instance')
    .option('--debug', 'to display debug logs')
    .action((name, nickname, options) => {
      let generate = new Generate(name, nickname, options, Common.getCurrentPath())
      findPackagePromise(generate)
      .then(parsePackagePromise)
      .then(selectModulePromise)
      .then(selectClassPromise)
      .then(checkInstanceAvailablePromise)
      .then(customizeVariablesPromise)
      .then(distCreationPromise)
      .then(instanceCreationPromise)
      .then(updateUsedFiles)
      .then(updateInstanceDependenciesPromise)
      .then(Common.displayMessagesPromise)
      .then(resolve)
      .catch(reject)
    })
    .on('--help', function () {
      console.log('displays a list of modules if no argument supplied')
    })
  })
}
