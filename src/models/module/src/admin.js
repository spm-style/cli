let Path = require('path')
let Chalk = require('chalk')
let Request = require('request')
let Preferences = require('preferences')
let CONST = require('../../../lib/const')
let Debug = require('../../../lib/debug')
let Common = require('../../../lib/common')

/* checks for project and module context */
let defineModuleNamePromise = (admin) => {
  if (admin.debug) { Debug() }
  return new Promise((resolve, reject) => {
    admin.pathInitial = Common.getCurrentPath()
    Common.findModuleJsonPromise(admin.pathInitial)
    .then(path => {
      if (!path) {
        return reject(new Error(`no module detected`))
      } else {
        admin.pathFinal = path
        Common.getJsonFilePromise(Path.join(admin.pathFinal, CONST.MODULE_JSON_NAME))
        .then(json => {
          if (!json) { return reject(new Error(`json file removed during process`)) }
          admin.moduleName = json.name
          return resolve(admin)
        })
        .catch(reject)
      }
    })
    .catch(reject)
  })
}

/* PROJECT ADMIN : to modify your module's permissions */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('admin')
    .description(`to modify your module's permissions`)
    .option('--owner-add <contributor>', `to add a new contributor to a module`)
    .option('--owner-remove <contributor>', `to remove a contributor from a module`)
    .option('--owner-list', `to list a module's contributors`)
    .option('--debug', `to display the debug logs`)
    .action(options => {
      defineModuleNamePromise(options)
      .then(admin => {
        let prefs = new Preferences(CONST.PREFERENCES)
        let options
        if ((admin.ownerAdd || admin.ownerRemove) && !prefs.token) { return reject(new Error(`you're not logged in, please use spm user`)) }
        if ((admin.ownerAdd ? 1 : 0) + (admin.ownerRemove ? 1 : 0) + (admin.ownerList ? 1 : 0) !== 1) {
          Program.on('--help', () => { console.log(Chalk.hex(CONST.WARNING_COLOR)('select one option for each module admin command')) })
          Program.help()
        } else if (admin.ownerAdd) {
          options = {
            method: 'post',
            body: { login: admin.ownerAdd },
            headers: {
              'Authorization': `bearer ${prefs.token}`
            },
            json: true,
            url: `${CONST.PACKAGE_ORIGIN_URL}/${admin.moduleName}/contributors/add`
          }
        } else if (admin.ownerRemove) {
          options = {
            method: 'post',
            body: { login: admin.ownerRemove },
            headers: {
              'Authorization': `bearer ${prefs.token}`
            },
            json: true,
            url: `${CONST.PACKAGE_ORIGIN_URL}/${admin.moduleName}/contributors/remove`
          }
        } else {
          options = {
            method: 'get',
            url: `${CONST.PACKAGE_ORIGIN_URL}/${admin.moduleName}/contributors`
          }
        }
        Request(options, (err, res, body) => {
          if (err) { return reject(err) }
          try {
            let json = body
            if (typeof body !== 'object') { json = JSON.parse(body) }
            if (json.statusCode >= 400) { return reject(new Error(json.message)) }
            if (admin.ownerAdd) {
              console.log(`🙋  you have added ${admin.ownerAdd} as contributor of ${admin.moduleName}`)
            } else if (admin.ownerRemove) {
              console.log(`😿  you have removed ${admin.ownerRemove} from ${admin.moduleName} contributors`)
            } else {
              console.log(`the following users are currently contributing to ${admin.moduleName}:`)
              let maxLen = 0
              for (let contributor of json.contributors) { maxLen = Math.max(maxLen, contributor.login.length) }
              for (let contributor of json.contributors) { console.log(`🕶  ${Array(maxLen - contributor.login.length).join(' ')}${contributor.login}: ${contributor.email}`) }
            }
            return resolve(body)
          } catch (e) { return reject(e) }
        })
      })
      .catch(reject)
    })
  })
}
