let Clear = require('clear')
let Request = require('request')
let Prompt = require('inquirer').prompt
let CONST = require('../../../lib/const')
let Debug = require('../../../lib/debug')
let Spinner = require('../../user/lib/spinner')

/* generic search requester to be called */
let searchRequestPromise = (pattern, options, page = 1) => {
  return new Promise((resolve, reject) => {
    if (options.clear === true) { Clear() }
    let url = `${CONST.PACKAGE_ORIGIN_URL}`
    let spinner = new Spinner('searching for packages...', 'monkey')
    spinner.start()
    Request({
      url: `${url}?offset=${CONST.SEARCH_RESULTS}&page=${page}${pattern ? '&search=' + pattern : ''}`,
      method: 'get'
    }, (err, res, body) => {
      if (err) { return reject(spinner.errorStop(err)) }
      let json = JSON.parse(body)
      if (options.debug) { Debug(json) }
      if (json.statusCode >= 400) { return reject(spinner.errorStop(json.message)) }
      spinner.successStop('list of packages\n')
      if (!json.packages.length) {
        return reject(new Error(`no package matching "${pattern}" found`))
      }
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
      let question = {
        name: 'page',
        type: 'list',
        message: '___\n=== page === ',
        choices: ['exit'],
        default: 'exit'
      }
      if (page !== 1) {
        question.choices.push('previous')
        question.default = 'previous'
      }
      if (json.next) {
        question.choices.push('next')
        question.default = 'next'
      }
      if (question.choices.length === 1) { return resolve() }
      Prompt([question])
      .then(answer => {
        if (answer.page === 'next') {
          searchRequestPromise(pattern, options, page + 1)
          .then(resolve)
          .catch(reject)
        } else if (answer.page === 'previous') {
          searchRequestPromise(pattern, options, page - 1)
          .then(resolve)
          .catch(reject)
        } else {
          return resolve()
        }
      })
    })
  })
}

/* PROJECT SEARCH : to browse spm registry about a module you're looking for */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('search')
    .alias('s')
    .description(`to browse spm registry about a module you're looking for`)
    .arguments('[pattern]')
    .option('--no-description', 'to remove the description from the displayed list')
    .option('--clear', `to clear the shell before displaying the results`)
    .option('--debug', 'to display debug logs')
    .action((pattern, options) => {
      searchRequestPromise(pattern, options)
      .then(resolve)
      .catch(reject)
    })
    .on('--help', function () {
    })
  })
}
