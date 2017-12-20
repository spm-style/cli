'use strict'
let Authentify = require('./authentify')
let Inquirer = require('inquirer')

/* spm user features 4 different actions */
let selectChoicePromise = (command) => {
  return new Promise((resolve, reject) => {
    if (!command || !['info', 'register', 'login', 'logout'].includes(command)) {
      Inquirer.prompt([{
        name: 'choice',
        type: 'list',
        message: 'What do you want to do, honorable foreigner ?',
        choices: ['register', 'login', 'info', 'logout'],
        default: 'register'
      }])
      .then(res => { return resolve(res.choice) })
      .catch(reject)
    } else {
      return resolve(command)
    }
  })
}

/* Commander for spm user */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('user')
    .arguments('[command]', '"info" for current user information')
    .description('used to register, login or logout')
    .action(command => {
      selectChoicePromise(command)
      .then(action => {
        switch (action) {
          case 'info':
            Authentify.getCurrentUserInfo()
            .then(resolve)
            .catch(reject)
            break
          case 'logout':
            Authentify.logout()
            .then(resolve)
            .catch(reject)
            break
          case 'login':
            Authentify.login(true)
            .then(resolve)
            .catch(reject)
            break
          case 'register':
            Authentify.register(true)
            .then(resolve)
            .catch(reject)
            break
          default:
            return resolve()
        }
      })
    })
    .on('--help', function () {})
  })
}
