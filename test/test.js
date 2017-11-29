let Assert = require('assert')
let Install = require('../lib').install
let Program = require('commander')
let Lib = require('../lib')
// let Sinon = require('sinon')
let Chalk = require('chalk')
let CONST = require('../lib/const.js')
let Fs = require('fs')
let inquirer = require('inquirer')

let intercept = require('intercept-stdout')

let keys = {
  up: '\u001b[A',
  down: '\u001b[B',
  left: '\u001b[D',
  right: '\u001b[C'
}

// let spy = Sinon.spy(console, 'log')
// let stdin = require('mock-stdin').stdin()

let sendAnswer = (table, index = 0) => {
  setTimeout(() => {
    stdin.send(table[index])
    if (index + 1 < table.length) { sendAnswer(table, index + 1) }
  }, 1)
}

describe('install', function () {
  describe('no argument / no dependency', function () {
    it('no test done at the moment - CLI integration pending', () => {
      Assert(1 === 1);
    })
    // it('should return je sais pas quoi', done => {
    //   process.chdir('test/firstInstall')
    // 	Lib.use(Program)
    // 	Program.parse(['node', 'spm', 'u'])
    // 	setTimeout(() => {
    //   sendAnswer(['\u001b[B', ' ', '\n'])
    //   setTimeout(() => {
    //     Assert(spy.callCount === 3, spy.callCount)
    //     spy.restore()
    //     done()
    //   }, 25)
    // 	}, 5)
    // })

    // it('should return error message', done => {
    // 	process.chdir('..')
    //   Lib.install(Program).catch(console.log)
    //   Program.parse(['node', 'spm', 'i'])
    //   setTimeout(() => {
    //     console.log('haha', Chalk.hex('#BB00FF')(spy.args[4]), 'hihi')
    //     Assert(spy.calledWith(CONST.ERROR.NO_PACKAGE_SPM))
    //     spy.restore()
    //     done()
    //   }, 5)
    // })
  })
})
