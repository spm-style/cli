let Fs = require('fs')
let Path = require('path')
let Clear = require('clear')
let Chalk = require('chalk')
let Figlet = require('figlet')
let Prompt = require('inquirer').prompt
let Common = require('../../../lib/common')
let CONST = require('../../../lib/const')
let Debug = require('../../../lib/debug')
let Models = require('../lib/models')

/* Detect if in the scope of a project */
let testProjectScopePromise = (create) => {
  return new Promise((resolve, reject) => {
    Common.findProjectJsonPromise(create.initialPath)
    .then(path => {
      create.projectPath = path
      if (create.options.htmlName) { return reject(new Error(`cannot create any html file in native modules located inside spm projects`)) }
      return resolve(create)
    })
    .catch(reject)
  })
}

/* Prompter asking for basic information for package creation */
let createModulePromise = (create) => {
  if (create.debug) { Debug() }
  return new Promise((resolve, reject) => {
    let questionObj = {
      version: {
        name: 'version',
        message: 'version',
        default: create.version,
        /* all versions are formatted as x1.x2.x3 with xi positive or null integers */
        validate: (value) => {
          return /^[0-9]+[.][0-9]+[.][0-9]+$/.test(value) ? true : Chalk.hex(CONST.WARNING_COLOR)('Please enter a valid version number')
        }
      },
      style: {
        name: 'style',
        message: 'style',
        type: 'list',
        choices: ['css', 'scss'],
        default: create.style
      },
      mainClass: {
        name: 'mainClass',
        message: 'main class',
        default: create.mainClass,
        /* spm names are never shorter than 2 characters */
        validate: (value) => {
          return (value.length && value.length > 1 && /^[a-zA-Z0-9_]*$/.test(value)) ? true : Chalk.hex(CONST.WARNING_COLOR)('use at least 2 characters, only alphanumerical')
        }
      },
      description: {
        name: 'description',
        message: 'description',
        /* descriptions should be at least 1 char long */
        validate: value => {
          return (value.length > 0) ? true : Chalk.hex(CONST.WARNING_COLOR)('description is required')
        }
      },
      jsStandard: {
        name: 'jsStandard',
        type: 'list',
        choices: ['modular', 'legacy'],
        default: 'legacy',
        message: 'chose your js standard : legacy only recommended for native script'
      },
      category: {
        name: 'category',
        message: 'category'
      },
      responsive: {
        name: 'responsive',
        type: 'checkbox',
        message: 'responsiveness',
        choices: ['watch', 'mobile', 'phablet', 'tablet', 'laptop', 'screenXl'],
        default: ['mobile', 'phablet', 'tablet', 'laptop', 'screenXl'],
        /* must be compatible with at least 1 device */
        validate: value => {
          return value.length || Chalk.hex(CONST.WARNING_COLOR)('module must be compatible with at least 1 device')
        }
      },
      keywords: {
        name: 'keywords',
        message: 'keywords',
        default: create.keywords.join(', '),
        filter: Common.optionList
      },
      htmlName: {
        name: 'htmlName',
        default: create.htmlName,
        message: `module's main html file`
      },
      ssName: {
        name: 'ssName',
        /* the entry point by default is index with the project's style extension */
        default: (current) => {
          return current.style ? `${create.name}.${current.style}` : create.ssName
        },
        message: `module's main stylesheet`
      },
      jsName: {
        name: 'jsName',
        default: create.jsName,
        message: `module's main script`
      },
      classes: {
        name: 'classes',
        message: 'classes',
        default: create.classes.join(', '),
        filter: Common.optionList
      },
      readme: {
        name: 'readme',
        message: 'readme'
      },
      repository: {
        name: 'repository',
        message: 'repository'
      },
      license: {
        name: 'license',
        message: 'license',
        default: create.license
      }
    }
    let questions = []
    for (let key of create.getKeys()) {
      if (typeof create.options[key] === 'function' || !create.options[key]) {
        if (key !== 'htmlName' || !create.projectPath) { questions.push(questionObj[key]) }
      }
    }
    if (questions.length && !create.default) {
      Clear()
      console.log(
        Chalk.hex('#FD7F57')(
          Figlet.textSync('spm', {horizontalLayout: 'full'})
        )
      )
      Prompt(questions)
      .then(answer => {
        for (let key in answer) { create[key] = answer[key] }
        return resolve(create)
      })
      .catch(err => { return reject(new Error(`Prompt error - ${err}`)) })
    } else { return resolve(create) }
  })
}

/* displays the complete package and asks user's confirmation */
let recapAndConfirmPromise = (create) => {
  if (create.debug) { Debug() }
  return new Promise((resolve, reject) => {
    let module = new Models.Module(create)
    create.json = module
    if (!create.default) {
      console.log(`About to write to ${Path.join(create.path, 'module-spm.json')}`)
      console.log(JSON.stringify(module, null, '  '))
      Common.promptConfirmation(module, true)
      .then(() => resolve(create))
      .catch(reject)
    } else { return resolve(create) }
  })
}

/* creates the module directory if not flat */
let createFolderPromise = (create) => {
  return new Promise((resolve, reject) => {
    if (!create.flat) {
      Fs.mkdir(Path.join(create.initialPath, create.name), err => {
        if (err) { return reject(err) }
        create.successes.push(`folder ${create.name} successfully created`)
        create.path = Path.join(create.initialPath, create.name)
        return resolve(create)
      })
    } else {
      create.path = create.initialPath
      return resolve(create)
    }
  })
}

/* creates the module files */
let createModuleFilePromise = (create) => {
  if (create.debug) { Debug(create) }
  return new Promise((resolve, reject) => {
    let filesToCreate = [
      {
        name: 'module-spm.json',
        toCreate: true,
        toForce: create.force,
        content: JSON.stringify(create.json, null, '  ')
      },
      {
        name: create.htmlName,
        toCreate: create.options.htmlFile || create.projectPath,
        toForce: false,
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${create.name}</title>
  <link rel="stylesheet" href="${create.ssName.endsWith('.scss') ? '.' : ''}${create.ssName.substring(0, create.ssName.lastIndexOf('.'))}.css">
</head>
<body>

  <h1>Module ${create.name} successfully created !</h1>

  <script type="text/javascript" src="${create.jsName}"></script>
</body>
</html>\n`
      },
      {
        name: create.jsName,
        toCreate: create.options.jsFile,
        toForce: false,
        content: `let moduleClasses = {
  // declare all classes used in javascript even as selectors, for example :
  // active: 'active',
  // Select: 'Select'
  // in javascript, use only moduleClasses.active to target the class active
}
// instances variables must start with $_ and be declared and assigned all at once
// variables in your codes you want the user to access to must start with $$_ and are called export variables
\n`
      },
      {
        name: create.ssName,
        toCreate: create.options.ssFile,
        toForce: false,
        content: `@import "variables-spm.${create.style}";\n`
      },
      {
        name: `variables-spm.${create.style}`,
        toCreate: true,
        toForce: false,
        content: `/${create.style === 'scss' ? '/ ' : '*\n'}declare all your variables here
${create.style === 'scss' ? '// instances variables must start with $_\n' : ''}${create.style === 'scss' ? '// ' : ''}for more information, check https://www.spm-style.com/documentation/publish
${create.style === 'css' ? '*/\n' : ''}`
      }
    ]
    let promises = []
    for (let file of filesToCreate) {
      if (file.toCreate) {
        promises.push(Common.writeFilePromise(create.flat ? file.name : Path.join(create.name, file.name), file.content, create, file.toForce))
      } else {
        create.warnings.push(`file ${file.name} not created as requested`)
      }
    }
    Promise.all(promises)
    .then(() => resolve(create))
    .catch(reject)
  })
}

/* MODULE CREATE : to create a new spm module with its core files */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('create')
    .alias('c')
    .description(`to create a new spm module with its core files, name should be at least 2 chars long`)
    .arguments('<name>', 'name should be longer than 2 characters')
    .option('--version <version>', `to configure the module's version`)
    .option('--style <style>', `to configure the module's style`)
    .option('--main-class <mainClass>', `to configure the module's main class`)
    .option('--description <description>', `to configure the module's description`)
    .option('--js-standard <standard>', `to configure the module's standard (legacy or modular)`)
    .option('--category <category>', `to configure the module's category`)
    .option('--responsive <devices>', `to configure the module's responsiveness`, Common.optionList, [])
    .option('--keywords <keywords>', `to configure the module's keywords`, Common.optionList, [])
    .option('--readme <readmeFile>', `to configure the module's README.md file`)
    .option('--repository <repository>', `to configure the module's repository`)
    .option('--license <license>', `to configure the module's license`)
    .option('--classes <classes>', `to configure the module's classes`, Common.optionList, []) // détection automatique ?
    .option('--html-name <htmlName>', `to configure the html file's name`)
    .option('--ss-name <ssName>', `to configure the stylesheet's name`)
    .option('--js-name <jsName>', `to configure the javascript file's name`)
    .option('--no-html-file', `to prevent from creating the spm html file`)
    .option('--no-ss-file', 'to prevent from creating the spm stylesheet')
    .option('--no-js-file', 'to prevent from creating the spm javascript file')
    .option('--no-file', 'to prevent creating any spm file but the module-spm.json')
    .option('--flat', 'to create the file in current directory')
    .option('--default', 'to create the module with default values')
    .option('--force', 'to erase the existing module-spm.json file')
    .option('--debug', 'to display debug logs')
    .action((name, options) => {
      if (!/^.{2,}$/.test(name) || !/^[a-zA-Z0-9_]*$/.test(name)) {
        Program.on('--help', () => { console.log(Chalk.hex(CONST.WARNING_COLOR)('name should be longer than 2 characters, only alphanumerical')) })
        Program.help()
        return reject(new Error('name should be longer than 2 characters, only alphanumerical'))
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
        let create = new Models.Create(name, options)
        Common.fileExistsPromise(Path.join(create.initialPath, name))
        .then(doesExist => {
          if (doesExist && !options.flat && !options.force) { return reject(new Error(`directory ${name} already exist in current folder - remove it or use option --force`)) }
          testProjectScopePromise(create)
          .then(createModulePromise)
          .then(createFolderPromise)
          .then(recapAndConfirmPromise)
          .then(createModuleFilePromise)
          .then(Common.displayMessagesPromise)
          .then(resolve)
          .catch(reject)
        })
        .catch(reject)
      }
    })
  })
}
