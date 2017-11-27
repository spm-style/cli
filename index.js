#!/usr/bin/env node
let Program = require('commander')
let Lib = require('./lib')
let CONST = require('./lib/const.js')
let Chalk = require('chalk')

// console.log('**** DEBUG ****\n', process.stdin)

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

/*
Add:
for (let action in Lib){
Lib[action](Program).catch(errorFunc);
}
*/

/** **all commands in CLI****/

for (let action in Lib) {
	Lib[action](Program).catch(errorFunc)
}

Program.parse(process.argv)
// module.exports = Program;

/** ******* utiliser les majuscules pour les actions plus globales et ponctuelles **/

// spm i blabla -g => installe dans le répertoire /lib/spm_modules
// spm i blibli --save => ajoute dans le package.json

// spm watch (-w)

// spm use (-u)

// options supplémentaires : -g (global), -p -r
// CHECKER les -up pour -u -p username password (pour l'instant, il comprend -up => -u -p avec username = -p !)

// spm -U -P pour l'espace privé (2nd temps)

  // définir une liste d'actions
