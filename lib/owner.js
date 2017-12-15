let Request = require('request')
let Preferences = require('preferences')
let CONST = require('./const')

/* Commander for spm owner */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('owner')
    .arguments('<action...>')
    .description('manage contributors on your packages') // login and logout in v2 [preferences]
    .action(action => {
      let actions = ['ls', 'add', 'rm']
      if (!actions.includes(action[0])) {
        return reject(new Error('use one of the following commands:\nspm owner add <user> <package>\nspm owner rm <user> <package>\nspm owner ls <package>'))
      } else if (action[0] === 'add' && action.length < 3) {
        return reject(new Error(`incorrect command - use 'spm owner add <users...> <package>'`))
      } else if (action[0] === 'rm' && action.length < 3) {
        return reject(new Error(`incorrect command - use 'spm owner rm <users...> <package>'`))
      } else if (action[0] === 'ls' && action.length !== 2) {
        return reject(new Error(`incorrect command - use 'spm owner ls <package>'`))
      } else {
        let prefs
        if (action[0] !== 'ls') {
          prefs = new Preferences(CONST.PREFERENCES)
          if (!prefs.token) { return reject(new Error(`you're not logged in, please use spm user`)) }
        }
        let options
        switch (action[0]) {
          case 'add':
            options = {
              method: 'post',
              body: { login: action.slice(1).slice(0, -1)[0] },
              headers: {
                'Authorization': `bearer ${prefs.token}`
              },
              json: true,
              url: `${CONST.PACKAGE_ORIGIN_URL}/${action[action.length - 1]}/contributors/add`
            }
            break
          case 'rm':
            options = {
              method: 'post',
              body: { login: action.slice(1).slice(0, -1)[0] },
              headers: {
                'Authorization': `bearer ${prefs.token}`
              },
              json: true,
              url: `${CONST.PACKAGE_ORIGIN_URL}/${action[action.length - 1]}/contributors/remove`
            }
            break
          case 'ls':
            options = {
              method: 'get',
              url: `${CONST.PACKAGE_ORIGIN_URL}/${action[1]}/contributors`
            }
            break
          default:
            Program.help()
            break
        }
        Request(options, (err, res, body) => {
          if (err) { return reject(err) }
          let json = body
          if (typeof body !== 'object') { json = JSON.parse(body) }
          if (json.statusCode >= 400) { return reject(new Error(json.message)) }
          switch (action[0]) {
            case 'add':
              console.log(`🙋  you have added ${action.slice(1).slice(0, -1)} as contributor of ${action[action.length - 1]}`)
              break
            case 'rm':
              console.log(`😿  you have removed ${action.slice(1).slice(0, -1)} from ${action[action.length - 1]} contributors`)
              break
            case 'ls':
              console.log(`the following users are currently contributing to ${action[1]}:`)
              let maxLen = 0
              for (let contributor of json.contributors) { maxLen = Math.max(maxLen, contributor.login.length) }
              for (let contributor of json.contributors) { console.log(`🕶  ${Array(maxLen - contributor.login.length).join(' ')}${contributor.login}: ${contributor.email}`) }
              break
            default:
              break
          }
          return resolve(body)
        })
      }
    })
    .on('--help', function () {
      console.log('use one of the following commands:\nspm owner add <users...> <package>\nspm owner rm <users...> <package>\nspm owner ls <package>')
    })
  })
}
