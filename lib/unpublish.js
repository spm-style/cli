let Chalk = require('chalk')
let Inquirer = require('inquirer')
let Request = require('request')
let CONST = require('./const')

/* Commander for spm unpublish */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('unpublish')
    .description(`to remove a package you're contributing to`)
    .arguments('<pkg>')
    .action(pkg => {
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
        Request({
          method: 'DELETE',
          body: {
            username: answer.username,
            password: answer.password
          },
          json: true,
          url: `${CONST.PUBLISH_URL}/${pkg}`
        }, (err, res, body) => {
          if (err) { return reject(err) }
          if (Math.floor(res.statusCode / 100) === 4) {
            return reject(new Error(res.message))
          } else {
            console.log(`${Chalk.hex(CONST.SUCCESS_COLOR)('SUCCESS')}: package ${pkg} has been unpublished`)
            return resolve(pkg)
          }
        })
      })
      .catch(reject)
    })
    .on('--help', function () {})
  })
}
