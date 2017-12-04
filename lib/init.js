let Inquirer = require('inquirer')
let Clear = require('clear')
let Chalk = require('chalk')
let Figlet = require('figlet')
let Fs = require('fs')
let Common = require('./common')
let PackageSpm = require('./models').PackageSpm
let CONST = require('./const')

let createPackageSpm = (nopublish) => { // (1)
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
        validate: (value) => {
          return (value.length && value.length > 2) ? true : Chalk.hex(CONST.WARNING_COLOR)('use at least 3 characters')
        }
      },
      {
        name: 'version',
        default: '1.0.0',
        message: 'version:',
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
      // {
      //  type: 'list',
      //  name: 'type',
      //  choices: ['native', 'component', 'template'],
      //  default: 'native',
      //  message: 'type:'
      // },
      {
        name: 'main',
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

let initMainCheck = (packageSpm) => { // (3a)
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
let initVariablesCheck = (packageSpm) => { // (3b)
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

let createSpmFiles = (packageSpm) => { // (3)
  return new Promise((resolve, reject) => {
    initMainCheck(packageSpm)
    .then(initVariablesCheck)
    .then(initSpmDom)
    .then(resolve)
    .catch(reject)
  })
}
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('init')
    .description('initializes the project with package.json')
    .option('-n, --nopublish', 'to remove the ref-dom.html added at init')
    .action((options) => {
      createPackageSpm(options.nopublish)
      .then(packageSpm => Common.promptConfirmation(packageSpm, true))
      .then(createSpmFiles)
      .then(res => { return Common.writeContent(JSON.stringify(res, null, '  ') + '\n', 'package-spm.json', '', res) })
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
