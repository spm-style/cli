let sinon = require('sinon')
let rewire = require('rewire')
let expect = require('chai').expect
let userLib = require('../../../src/models/user')
const cmd = '../../../src/spm'
let globalWrapper = require('../../inquirer-input-wrapper')

/* inputs depending on the user prompt scenarios */
let userActions = {
  register: [['testTravis'], ['test@travis.com'], ['Bonjour123']],
  login: [['testTravis'], ['Bonjour123']]
}

/* path for variables to be changed in wrapper as a function of command */
let userConfig = name => [{name: 'Authentify', path: 'lib', variables: ['Prompt']}, {name, path: 'src', variables: ['Authentify']}]

/* TEST */
module.exports = (dir) => {
  it('register', done => {
    let Program = rewire('commander')
    globalWrapper('user', 'register', userActions, userConfig('register'))(Program)
    .then(token => {
      expect(token).to.be.a('string')
      done()
    })
    .catch(err => {
      expect(err.message).to.equal('😱   user testTravis already exists')
      done()
    })
    Program.parse([cmd, 'user', 'register'])
  })
  it('logout', done => {
    sinon.spy(console, 'log')
    let Program = rewire('commander')
    userLib.logout(Program)
    .then(() => {
      let args = console.log.args[console.log.args.length - 1][console.log.args[console.log.args.length - 1].length - 1]
      expect(args).to.include('disconnected')
      console.log.restore()
      done()
    })
    .catch(err => {
      expect(err.message).to.equal('error')
      console.log.restore()
      done()
    })
    Program.parse([cmd, 'user', 'logout'])
  })
  it('login', done => {
    let Program = rewire('commander')
    globalWrapper('user', 'login', userActions, userConfig('login'))(Program)
    .then(token => {
      expect(token).to.be.a('string')
      done()
    })
    .catch(err => {
      expect(err.message).to.equal('error')
      done()
    })
    Program.parse([cmd, 'user', 'login'])
  })
  it('detail', done => {
    sinon.spy(console, 'log')
    let Program = rewire('commander')
    userLib.detail(Program)
    .then(() => {
      let args = console.log.args[console.log.args.length - 1][console.log.args[console.log.args.length - 1].length - 1]
      expect(args).to.include('email: test@travis.com')
      console.log.restore()
      done()
    })
    .catch(err => {
      expect(err).to.equal(undefined)
      console.log.restore()
      done()
    })
    Program.parse([cmd, 'user', 'detail'])
  })
}
