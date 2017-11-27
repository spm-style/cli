let request = require('request')
let Targz = require('tar.gz')
let Fs = require('fs')

let url = `http://localhost:3001/modules/download/adrien_test1/1.0.9`

let rootPath

let tmpPath = 'montest2'

let parse = Targz().createParseStream()
.on('entry', (entry) => {
  console.log(entry.path)
  if (!rootPath) {
    rootPath = entry.path
  }
  if (!entry.path.endsWith('/')) {
    let hiddenFlag = false
    let folders = entry.path.substring(rootPath.length).split('/')
    let item = folders.splice(-1, 1)
    let folderPath = '.'
    for (let folder of folders) {
		  if (!Fs.existsSync(tmpPath + '/' + folderPath + '/' + folder)) {
		    if (!folder.startsWith('.')) {
		      Fs.mkdirSync(tmpPath + '/' + folderPath + '/' + folder)
		    } else {
		      hiddenFlag = true
		      break
		    }
		  }
		  folderPath = folderPath + '/' + folder
    }
    if (!hiddenFlag) {
		  entry.pipe(Fs.createWriteStream(tmpPath + '/' + entry.path.substring(rootPath.length)))
    }
  }
})
.on('error', (err) => {
  console.log('--1--', err)
})
.on('end', () => {
  console.log('process done')
})

request.get(url)
.pipe(parse)
