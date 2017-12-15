let Chalk = require('chalk')
let CONST = require('./const')

let debug = (...args) => {
  let stack = new Error().stack
  let i = stack.indexOf('\n    at ', stack.indexOf('\n    at ') + 8)
  console.log(`${Chalk.hex(CONST.DEBUG_COLOR)('FUNCTION     ')}${stack.substring(i + 8, stack.indexOf(' ', i + 8))}`)
  for (let argument of args) {
    console.log(Chalk.hex(CONST.DEBUG_COLOR)(`***********************************************************************************************`))
    console.log(argument)
  }
  console.log(Chalk.hex(CONST.DEBUG_COLOR)(`***********************************************************************************************`))
}

module.exports = debug
