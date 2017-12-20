let Request = require('request')
let CONST = require('./const')
let Spinner = require('./spinner')

/* Commander for spm search */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('search')
    .alias('s')
    .description('to display a list of packages whose name and/or author matches the argument')
    .arguments('[pattern]')
    .option('--no-description', 'to remove the description from the displayed list')
    .action((pattern, options) => {
      let url = `${CONST.PACKAGE_ORIGIN_URL}`
      let spinner = new Spinner('searching for packages...', 'monkey')
      spinner.start()
      Request({
        url,
        method: 'get',
      }, (err, res, body) => {
        // if (err) { return reject(spinner.errorStop(err)) }
        // let json = JSON.parse(body)
        // if (json.statusCode >= 400) { return reject(spinner.errorStop(json.message)) }
        let json = {
          packages: [
            {
              name: 'bonjour',
              description: 'je suis une description vraiment très longue',
              author: 'adrien',
              download: '8'
            },
            {
              name: 'bonjour',
              description: 'je suis une description vraiment très longue',
              author: 'adrien',
              download: '12'
            },
            {
              name: 'bonjour',
              description: 'je suis une description vraiment très longue',
              author: 'herve',
              download: '123'
            },
            {
              name: 'bonjour',
              description: 'je suis une description vraiment très longue',
              author: 'adrien',
              download: '156'
            },
            {
              name: 'bonjour',
              description: 'je suis une description',
              author: 'herve',
              download: '1'
            },
            {
              name: 'bonjour',
              description: 'je suis une description vraiment très longue et meme encore plus',
              author: 'adrien',
              download: '17'
            },
            {
              name: 'bonjour',
              description: 'je suis une description vraiment très longue',
              author: 'herve',
              download: '23'
            },
          ]
        }
        spinner.stop()
        let order = ['name', 'author', 'description', 'download']
        let maxLen = { name: 0, author: 0, download: 0 }
        if (options.description) { maxLen.description = 0 }
        let max = 50
        for (let item of json.packages) {
          for (let key in item) { maxLen[key] = Math.min(Math.max(item[key].length, key.length, maxLen[key]), max) }
        }
        let header = '|'
        for (let key of order) { header += ` ${key.substring(0, max)}${Array(maxLen[key] - Math.min(key.length, max) + 1).join(' ')} |` }
        console.log(header) 
        for (let item of json.packages) {
          let content = '|'
          for (let key of order) { content += ` ${item[key].substring(0, max)}${Array(maxLen[key] - Math.min(item[key].length, max) + 1).join(' ')} |`}
          console.log(content)
        }
      })
    })
    .on('--help', function () {
    })
  })
}
