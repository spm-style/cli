let Preferences = require('preferences')
let Ora = require('ora')
let Chalk = require('chalk')
let CONST = require('../lib/const')
let Request = require('request')
let Inquirer = require('inquirer')

let spinnerStop = (spinner, message) => {
  spinner.stop()
  return new Error(`😱   ${message}`)
}

let getSpmAPIToken = (force = false) => {
  return new Promise((resolve, reject) => {
    let prefs = new Preferences(CONST.PREFERENCES)
    if (!prefs.token || force) {
      let spinner = new Ora({
        text: 'login you in...',
        spinner: 'monkey'
      })
      Inquirer.prompt([
        {
          name: 'choice',
          type: 'list',
          message: 'Who are you, honorable foreigner ?',
          choices: ['login', 'register'],
          default: 'register'
        },
        {
          name: 'name',
          message: 'name',
          /* spm names cannot be shorter than 3 characters */
          validate: (value) => {
            return (value.length && value.length > 2) ? true : Chalk.hex(CONST.WARNING_COLOR)('use at least 3 characters')
          }
        },
        {
          name: 'email',
          message: 'Email',
          /* only used for register */
          when: answers => { return answers.choice === 'register' },
          /* email regex */
          validate: (value) => {
            return /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(value) ? true : Chalk.hex(CONST.WARNING_COLOR)('Please enter a valid email')
          }
        },
        {
          name: 'password',
          type: 'password',
          message: 'password',
          /* passwords rule : 8 characters, at least 1 letter and 1 number */
          validate: (value) => {
            return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(value) ? true : Chalk.hex(CONST.WARNING_COLOR)('Please enter at least 8 characters with at least 1 letter and 1 number')
          }
        }
      ]).then(answer => {
        let formData = {
          login: answer.name,
          password: answer.password
        }
        switch (answer.choice) {
          case 'login':
            spinner.start()
            Request({
              url: CONST.LOGIN_URL,
              method: 'post',
              formData
            }, (err, response, body) => {
              if (err) { return reject(spinnerStop(spinner, err)) }
              try {
                let res = JSON.parse(body)
                if (res.statusCode >= 400) {
                  return reject(spinnerStop(spinner, res.message))
                } else {
                  spinner.stopAndPersist({
                    symbol: Chalk.hex(CONST.SUCCESS_COLOR)('✔'),
                    text: `logged in as ${Chalk.hex(CONST.SUCCESS_COLOR)(answer.name)}`
                  })
                  prefs.token = res.token
                  prefs.user = res.user.login
                  prefs.email = res.user.email
                  return resolve(prefs.token)
                }
              } catch (err) { return reject(spinnerStop(spinner, err)) }
            })
            break
          case 'register':
            formData.email = answer.email
            spinner.start()
            Request({
              url: CONST.REGISTER_URL,
              method: 'put',
              formData
            }, (err, response, body) => {
              if (err) { return reject(spinnerStop(spinner, err)) }
              try {
                let res = JSON.parse(body)
                if (res.statusCode >= 400) {
                  return reject(spinnerStop(spinner, res.message))
                } else {
                  spinner.stopAndPersist({
                    symbol: Chalk.hex(CONST.SUCCESS_COLOR)('✔'),
                    text: `user ${Chalk.hex(CONST.SUCCESS_COLOR)(answer.name)} successfully created`
                  })
                  prefs.token = res.token
                  prefs.user = res.user.login
                  prefs.email = res.user.email
                  return resolve(prefs.token)
                }
              } catch (err) { return reject(spinnerStop(spinner, err)) }
            })
            break
          default:
            return reject(spinnerStop(spinner, `invalid authentification option: ${answer.choice}`))
        }
      })
      .catch(reject)
    } else { return resolve(prefs.token) }
  })
}

let getCurrentUserInfo = () => {
  return new Promise((resolve, reject) => {
    let prefs = new Preferences(CONST.PREFERENCES)
    if (!prefs.user) {
      Inquirer.prompt([{
        name: 'authentify',
        type: 'confirm',
        message: 'no user detected, do you want to login or register ?'
      }])
      .then(answer => {
        if (answer.authentify) { getSpmAPIToken().then(resolve).catch(reject) } else { return resolve() }
      })
      .catch(reject)
    } else {
      let table = ['🔹', '🔸']
      let i = 0
      for (let key in prefs) {
        if (key !== 'token') {
          i++
          console.log(`${table[i % 2]}  ${key}: ${prefs[key]}`)
        }
      }
      return resolve()
    }
  })
}

let logout = () => {
  return new Promise((resolve, reject) => {
    let prefs = new Preferences(CONST.PREFERENCES)
    if (!prefs || !Object.keys(prefs).length) {
      console.log(Chalk.hex(CONST.WARNING_COLOR)('you are already disconnected'))
      return resolve()
    } else {
      for (let key in prefs) { delete prefs[key] }
      console.log('user disconnected - come again soon 👻')
      return resolve()
    }
  })
}

module.exports = {
  getSpmAPIToken,
  getCurrentUserInfo,
  logout
}
