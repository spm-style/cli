const { spawn } = require('child_process')

const ls = spawn('mocha', ['test/test.js'])

let errors = []

ls.stdout.on('data', (data) => {
  if (data.toString().indexOf('s)') >= 0) {
    console.log(`${data}`)
  }
})

ls.stderr.on('data', (data) => {
  errors.push(`stderr: ${data}`)
})

ls.on('close', (code) => {
  for (let error of errors) {
    console.log(error)
  }
})
