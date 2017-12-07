'use strict'
let Chalk = require('chalk')
let Inquirer = require('inquirer')
let Request = require('request')
let CONST = require('./const')

/* Command line for spm user */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('user')
    .description('used to register') // login and logout in v2 [preferences]
    .action(() => {
      // use inquirer to prompt for action if no parameter used
      let questions = [
        {
          name: 'username',
          message: 'Username',
          /* spm names cannot be shorter than 3 characters */
          validate: (value) => {
            return (value.length && value.length > 2) ? true : Chalk.hex(CONST.WARNING_COLOR)('use at least 3 characters')
          }
        },
        {
          name: 'email',
          message: 'Email',
          /* email regex */
          validate: (value) => {
            return /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(value) ? true : Chalk.hex(CONST.WARNING_COLOR)('Please enter a valid email')
          }
        },
        {
          name: 'password',
          type: 'password',
          message: 'Password',
          /* passwords rule : 8 characters, at least 1 letter and 1 number */
          validate: (value) => {
            return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(value) ? true : Chalk.hex(CONST.WARNING_COLOR)('Please enter at least 8 characters with at least 1 letter and 1 number')
          }
        }
      ]

      Inquirer.prompt(questions)
      .then(answer => {
        let formData = {
          login: answer.username,
          email: answer.email,
          password: answer.password
        }
        Request.put({url: CONST.REGISTER_URL, formData: formData}, function (err, response, body) {
          if (err) { return reject(err) }
          let res = JSON.parse(body)
          if (Math.floor(res.statusCode / 100) === 4) {
            return reject(new Error(res.message))
          } else {
            console.log(`${Chalk.hex(CONST.SUCCESS_COLOR)('SUCCESS')}: the user ${Chalk.hex(CONST.SUCCESS_COLOR)(answer.username)} has been created`)
            return resolve(answer.username)
          }
        })
      })
      .catch(reject)
    })
    .on('--help', function () {
    })
  })
}
