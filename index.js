#!/usr/bin/env node
let Program = require('commander')
let Lib = require('./lib')
let CONST = require('./lib/const.js')
let Chalk = require('chalk')

// in case the user presses ctrl+C during the process
process.stdin.setRawMode(true)
process.stdin.on('keypress', function (chunk, key) {
  if (key && key.name === 'c' && key.ctrl) {
    console.log(Chalk.hex(CONST.ERROR_COLOR)('\nAborted by user'))
    process.exit()
  }
})

let errorFunc = (err) => {
  console.log(Chalk.hex(CONST.ERROR_COLOR)(err))
}

/** **all commands in CLI****/
for (let action in Lib) {
  Lib[action](Program).catch(errorFunc)
}

Program
.version('1.0.0')
.parse(process.argv)

if (Program.args.length === 0) {
  Program.help()
}
