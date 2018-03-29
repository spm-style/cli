let Standard = require('standard')
let expect = require('chai').expect
const util = require('util')
let Interceptor = require('./lib/intercept')
let testInterceptor

let dir = process.cwd()

let importTest = (name, path) => {
  describe(name, function () {
    require(path)(dir)
  })
}

/* testing standard.js */
describe('f° Standard', () => {
  it('src', done => {
    Standard.lintFiles([], { cwd: 'src' }, function (err, results) {
      if (err) { console.log(err) }
      let issues = []
      for (let result of results.results) {
        if (result.errorCount || result.warningCount) {
          issues.push({ filePath: result.filePath, messages: result.messages })
        }
      }
      console.log(issues)
      expect(issues.length).to.equal(0, util.inspect(issues, false, null))
      console.log('done')
      done()
      console.log('post-done')
    })
  })
})

/* starting the interceptor */
describe('f° Interceptor on', () => {
  it('done', () => {
    testInterceptor = Interceptor.startInterceptor()
    expect(testInterceptor).to.not.equal(null)
  })
})
/* importing all the test categories */
importTest('model USER', './models/USER/test')
importTest('model PROJECT', './models/PROJECT/test')
importTest('model MODULE', './models/MODULE/test')
/* stoping the interceptor */
describe('f° Interceptor off', () => {
  it('done', () => {
    Interceptor.stopInterceptor(testInterceptor)
  })
})
