let Inquirer = require('inquirer')
let Clear = require('clear')
let Chalk = require('chalk')
let Figlet = require('figlet')
let Fs = require('fs')
let Common = require('./common')
let PackageSpm = require('./models').PackageSpm
let CONST = require('./const')

/* Prompter asking for basic information for package creation */
let createPackageSpm = (nopublish) => {
  return new Promise((resolve, reject) => {
    Clear()
    console.log(
      Chalk.hex('#DF5333')(
        Figlet.textSync('spm', {horizontalLayout: 'full'})
      )
    )
    let questions = [
      {
        name: 'name',
        message: 'module name',
        default: Common.getCurrentDirectory(),
        /* spm names are never shorter than 3 characters */
        validate: (value) => {
          return (value.length && value.length > 2) ? true : Chalk.hex(CONST.WARNING_COLOR)('use at least 3 characters')
        }
      },
      {
        name: 'version',
        default: '1.0.0',
        message: 'version:',
        /* all versions are formatted as x1.x2.x3 with xi positive or null integers */
        validate: (value) => {
          return /^[0-9]+[.][0-9]+[.][0-9]+$/.test(value) ? true : Chalk.hex(CONST.WARNING_COLOR)('Please enter a valid version number')
        }
      },
      {
        type: 'list',
        name: 'style',
        choices: ['css', 'scss'], // + 'sass', 'less'
        default: 'scss',
        message: 'default style:'
      },
      {
        name: 'category',
        message: `project's category`
      },
      // {
      //  type: 'list',
      //  name: 'type',
      //  choices: ['native', 'component', 'template'],
      //  default: 'native',
      //  message: 'type:'
      // },
      {
        name: 'main',
        /* by default, the main class has the same name as the project's */
        default: (current) => {
          return current.name
        },
        message: 'main class in your module'
      },
      {
        name: 'classes',
        message: 'other classes in your module'
      },
      {
        name: 'entry',
        /* the entry point by default is index with the project's style extension */
        default: (current) => {
          return `index.${current.style}`
        },
        message: 'entry point:'
      },
      {
        name: 'variables',
        message: 'variables:'
      },
      {
        name: 'author',
        default: 'anonymous',
        message: 'author:'
      },
      {
        name: 'repository',
        message: 'repository:'
      },
      {
        name: 'readme',
        default: 'README.md',
        message: 'readme:'
      },
      {
        name: 'contributors',
        message: 'contributors:'
      },
      {
        name: 'license',
        default: 'IST',
        message: 'license:'
      },
      {
        name: 'keywords',
        message: 'keywords:'
      },
      {
        name: 'description',
        message: 'description:'
      }
    ]
    Inquirer.prompt(questions)
      .then(answer => {
        let packageSpm = new PackageSpm(answer, nopublish)
        console.log('About to write to ' + Common.getCurrentPath() + '/package-spm.json')
        console.log(JSON.stringify(packageSpm, null, '  '))
        return resolve(packageSpm)
      })
      .catch(err => { return reject(new Error(`Prompt error - ${err}`)) })
  })
}

/* Checks if entry file exists and creates it if not */
let initEntryCheck = (packageSpm) => {
  return new Promise((resolve, reject) => {
    if (!Fs.existsSync(packageSpm.entry)) {
      Common.writeContent(`@import 'variables-spm.${packageSpm.style}';\n`, packageSpm.entry)
      .then(() => { packageSpm.successes.push(`${packageSpm.entry} has been successfully created`); return resolve(packageSpm) })
      .catch(reject)
    } else {
      packageSpm.warnings.push(`${packageSpm.entry} not created, make sure you import spm variables-spm.${packageSpm.style} file in your project`)
      return resolve(packageSpm)
    }
  })
}

/* Checks if the variables-spm file exists and creates it if not */
let initVariablesCheck = (packageSpm) => {
  return new Promise((resolve, reject) => {
    if (!Fs.existsSync(`variables-spm.${packageSpm.style}`)) {
      let content = packageSpm.style === 'css' ? ':root{\n/*\n' : ''
      for (let instanceVariable of packageSpm.variables) { content = `${content}${packageSpm.style === 'css' ? '\t--' : '// $'}_${instanceVariable}: ;\n` }
      if (packageSpm.style === 'css') { content += '*/\n}\n' }
      Common.writeContent(content, `variables-spm.${packageSpm.style}`)
      .then(() => { packageSpm.successes.push(`variables-spm.${packageSpm.style} has been successfully created`); return resolve(packageSpm) })
      .catch(reject)
    } else {
      packageSpm.warnings.push(`variables-spm.${packageSpm.style} file already in your project`)
      return resolve(packageSpm)
    }
  })
}

/* Checks if the reference dome file exists and creates it if not - only for custom dom */
let initSpmDom = (packageSpm) => {
  return new Promise((resolve, reject) => {
    if (!packageSpm.nopublish && !Fs.existsSync('ref-dom.html')) {
      Common.writeContent(`\n`, 'ref-dom.html')
      .then(() => { packageSpm.successes.push('ref-dom.html has been successfully created'); return resolve(packageSpm) })
      .catch(reject)
    } else {
      if (!packageSpm.nopublish) { packageSpm.warnings.push('ref-dom.html file already in your project') }
      return resolve(packageSpm)
    }
  })
}

/* Calls entry, variables and dom checkers */
let createSpmFiles = (packageSpm) => {
  return new Promise((resolve, reject) => {
    initEntryCheck(packageSpm)
    .then(initVariablesCheck)
    .then(initSpmDom)
    .then(resolve)
    .catch(reject)
  })
}

/* Commander for spm init */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('init')
    .description('initializes the project with package.json')
    .option('-n, --nopublish', 'to remove the ref-dom.html added at init')
    .option('--debug', 'to display debug logs')
    .action((options) => {
      createPackageSpm(options.nopublish, options.debug)
      .then(packageSpm => Common.promptConfirmation(packageSpm, true))
      .then(createSpmFiles)
      .then(res => {
        let finalPackage = JSON.parse(JSON.stringify(res))
        delete finalPackage.successes
        delete finalPackage.warnings
        delete finalPackage.errors
        delete finalPackage.debug
        delete finalPackage.nopublish
        return Common.writeContent(JSON.stringify(finalPackage, null, '  ') + '\n', 'package-spm.json', '', res)
      })
      .then(res => {
        return new Promise((resolve, reject) => {
          res.successes.push('package-spm.json has been successfully created')
          return resolve(res)
        })
      })
      .then(Common.displayMessagesPromise)
      .catch(reject)
    })
  })
}
