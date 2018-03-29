const { spawn } = require('child_process')

const ls = spawn('mocha', ['test/test.js', '--slow', '0'])

let errors = []

ls.stdout.on('data', (data) => {
  let newData = data.toString()
  if (newData.indexOf('s)') >= 0 || newData.indexOf('✓') >= 0 || newData.indexOf('  model ') >= 0 || newData.indexOf('  f° ') >= 0) {
    if (newData.endsWith('\n')) { newData = newData.slice(0, -1) }
    if (newData.startsWith('\n')) { newData = newData.substring(1) }
    console.log(newData)
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
