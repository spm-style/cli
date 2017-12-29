let Request = require('request')
let CONST = require('./const')
let Spinner = require('./spinner')
let Debug = require('./debug')

/* Commander for spm search */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('search')
    .alias('s')
    .description('to display a list of packages whose name and/or author matches the argument')
    .arguments('[pattern]')
    .option('--no-description', 'to remove the description from the displayed list')
    .option('--debug', 'to display debug logs')
    .action((pattern, options) => {
      let url = `${CONST.PACKAGE_ORIGIN_URL}`
      let spinner = new Spinner('searching for packages...', 'monkey')
      spinner.start()
      Request({
        url,
        method: 'get'
      }, (err, res, body) => {
        if (err) { return reject(spinner.errorStop(err)) }
        let json = JSON.parse(body)
        if (options.debug) { Debug(json) }
        if (json.statusCode >= 400) { return reject(spinner.errorStop(json.message)) }
        spinner.successStop('list of packages\n')
        let order = ['name', 'author', 'download']
        let inputMap = {
          name: 'name',
          author: 'author.login',
          download: 'downloadTotal',
          description: 'distTags.latest.description'
        }
        let maxLen = { name: 0, author: 0, download: 0 }
        if (options.description) {
          maxLen.description = 0
          order.push('description')
        }
        let max = 50
        let results = []
        for (let item of json.packages) {
          let content = {}
          for (let key of order) {
            let table = inputMap[key].split('.')
            let info = item
            while (table.length) {
              info = info[table[0]]
              table.shift()
            }
            info = info.toString()
            maxLen[key] = Math.min(Math.max(info.length, key.length, maxLen[key]), max)
            content[key] = info
          }
          results.push(content)
        }
        let header = ' '
        for (let key of order) { header += ` ${key.substring(0, max).toUpperCase()}${Array(maxLen[key] - Math.min(key.length, max) + 1).join(' ')}  ` }
        console.log(header)
        for (let item of results) {
          let content = ' '
          for (let key of order) { content += ` ${item[key].length > max ? item[key].substring(0, max - 3) + '...' : item[key]}${Array(maxLen[key] - Math.min(item[key].length, max) + 1).join(' ')}  ` }
          console.log(content)
        }
      })
    })
    .on('--help', function () {
    })
  })
}
