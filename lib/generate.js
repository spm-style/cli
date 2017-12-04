'use strict'
let Fs = require('fs')
let Chalk = require('chalk')
let Inquirer = require('inquirer')
let Generate = require('./models').Generate
let Common = require('./common')
let CONST = require('./const')

/* Checks where package-spm.json file is to define the project's scope */
let findPackagePromise = (generate) => {
  return new Promise((resolve, reject) => {
    if (generate.path.indexOf(CONST.USER_DIRECTORY) === -1) { return reject(CONST.ERROR.OUT_OF_SCOPE) }
    while (generate.path !== CONST.USER_DIRECTORY) {
      if (Fs.existsSync(generate.path + '/package-spm.json')) {
        generate.pathPackage = generate.path + '/package-spm.json'
        if (!Fs.existsSync(generate.path + '/spm_modules')) { return reject(new Error('please install a module before using it')) } else { generate.pathModules = generate.path + '/spm_modules' }
        if (Fs.existsSync(generate.path + '/variables-spm.scss')) { generate.pathVariables = generate.path + '/variables-spm.scss' } else { return reject(new Error('no variables-spm.scss file found - ')) }
        return resolve(generate)
      }
      generate.path = generate.path.substring(0, generate.path.lastIndexOf('/'))
    }
    return reject(new Error(CONST.ERROR.OUT_OF_SCOPE))
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
    Inquirer.prompt(questions)
    .then(answer => {
      return resolve(answer.res)
    })
    .catch(reject)
  })
}

/* To define the targeted module(s) */
let selectModulePromise = (generate) => {
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
  return new Promise((resolve, reject) => {
    if (!generate.nickname) {
      generate.nickname = generate.jsonFile.name
    }
    generate.pathInstance = `${generate.pathModules}/${generate.moduleName}/dist/${generate.nickname}.${generate.style}`
    if (Fs.existsSync(generate.pathInstance)) {
      if (generate.isForce) {
        Fs.unlink(generate.pathInstance, err => {
          if (err) { return reject(err) }
          return resolve(generate)
        })
      } else { return reject(new Error(`${generate.nickname} instance already exists in module ${generate.moduleName} - use option -f to force`)) }
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
  return new Promise((resolve, reject) => {
    generate.variablesMap = {}
    generate.nicknames = {}
    for (let item of generate.jsonFile.classes) {
      if (item.checked) {
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
    Inquirer.prompt(questions)
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
      Inquirer.prompt(nicknamesQuestions)
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
  return new Promise((resolve, reject) => {
    if (!Fs.existsSync(`${generate.pathModules}/${generate.moduleName}/dist`)) {
      Fs.mkdirSync(`${generate.pathModules}/${generate.moduleName}/dist`)
    }
    return resolve(generate)
  })
}

/* determines the parameters order, replaces customized variables with new value and generates the new file */
let instanceCreationPromise = (generate) => {
  return new Promise((resolve, reject) => {
    Fs.readFile(`${generate.pathModules}/${generate.moduleName}/${generate.jsonFile.entry}`, 'utf8', (err, data) => {
      if (err) { return reject(err) }
      let parameters = ''
      let i = data.indexOf('@mixin spm-')
      i = data.indexOf('(', i)
      let j = data.indexOf(')', i)
      for (let parameter of data.substring(i + 1, j).split(',')) {
        parameter = Common.removeWhitespaces(parameter)
        if (parameter.startsWith('$local-')) {
          parameters += `${generate.variablesMap[parameter.substring(7)].to || generate.variablesMap[parameter.substring(7)].from},`
        } else if (parameter.startsWith('$mixin-local-')) {
          parameters += `'${generate.nicknames[parameter.substring(13)]}',`
        } else {
          return reject(new Error(`wrong parameter ${parameter} in module entry point file`))
        }
      }
      if (parameters.endsWith(',')) { parameters = parameters.slice(0, -1) }
      let output = `@import "../variables-spm.scss";\n@import "../${generate.jsonFile.entry}";\n\n`
      output += `@include spm-${generate.jsonFile.main}-class(${parameters});\n`
      Fs.writeFile(`${generate.pathModules}/${generate.moduleName}/dist/${generate.nickname}.scss`, output, err => {
        if (err) { return reject(err) }
        generate.successes.push(`instance ${generate.nickname}.scss of module ${generate.moduleName} has been generated`)
        return resolve(generate)
      })
    })
  })
}

/* adds imports in files using the new instance(s) */
let updateUsedFiles = (generate) => {
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

/* Commander for spm generate */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('generate')
    .alias('g')
    .description('to generate a customized instance of a spm module')
    .arguments('[name] [nickname]')
    .option('-r, --rename', `to modify all classes' names`)
    .option('--scss', `if you use scss preprocessing language, css by default`)
    .option('-u, --use [path]', 'to use the generated instance in your project')
    .option('-C, --class', 'to target a class and not a module')
    .option('-f, --force', 'to force to write the requested instance')
    .action((name, nickname, options) => {
      let generate = new Generate(name, nickname, options, Common.getCurrentPath())
      findPackagePromise(generate)
      .then(selectModulePromise)
      .then(selectClassPromise)
      .then(checkInstanceAvailablePromise)
      .then(customizeVariablesPromise)
      .then(distCreationPromise)
      .then(instanceCreationPromise)
      .then(updateUsedFiles)
      .then(Common.displayMessagesPromise)
      // .then(packageUpdatePromise)
      .then(resolve)
      .catch(reject)
    })
    .on('--help', function () {
      console.log('displays a list of modules if no argument supplied')
    })
  })
}
