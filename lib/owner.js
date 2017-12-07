let Request = require('request')
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
        let options
        switch (action[0]) {
          case 'add':
            options = {
              method: 'post',
              body: { owners: action.slice(1).slice(0, -1) },
              json: true,
              url: `${CONST.PACKAGE_URL}/${action[action.length - 1]}/owners/add`
            }
            break
          case 'rm':
            options = {
              method: 'post',
              body: { owners: action.slice(1).slice(0, -1) },
              json: true,
              url: `${CONST.PACKAGE_URL}/${action[action.length - 1]}/owners/remove`
            }
            break
          case 'ls':
            options = {
              method: 'get',
              url: `${CONST.PACKAGE_URL}/${action[1]}/owners`
            }
            break
          default:
            Program.help()
            break
        }
        Request(options, (err, res, body) => {
          if (err) { return reject(err) }
          return resolve(body)
        })
      }
    })
    .on('--help', function () {
      console.log('use one of the following commands:\nspm owner add <users...> <package>\nspm owner rm <users...> <package>\nspm owner ls <package>')
    })
  })
}
