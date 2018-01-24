let sinon = require('sinon')
let rewire = require('rewire')
let expect = require('chai').expect
let Lib = require('../lib')

/* MODIFYING THE FILE FOR BETTER PROMPT */
let Wrapper = require('./inquirer-input-wrapper')

/* different inputs depending on the prompt scenario */
let actions = {
  register: [['testTravis'], ['test2@travis.com'], ['Bonjour123']],
  login: [['testTravis'], ['Bonjour123']],
  info: [['n', 'testTravis', 'Bonjour123']]
}

// /* calls a different wrapper for each prompt scenario */
let userPrompt = type => questions => {
  let Prompt = require('inquirer').prompt
  let myPromise = Prompt(questions)
  Wrapper(myPromise.ui, actions[type])
  return myPromise
}

// /* wrap the lib function depending on a mapping, for each scenario, in strict order */
let wrapMyFunc = files => type => {
  let myCustomFiles = []
  let customFilesMap = {}
  for (let file of files) {
    myCustomFiles.push(rewire(`../lib/${file.name.toLowerCase()}`))
    customFilesMap[file.name] = myCustomFiles[myCustomFiles.length - 1]
  }
  for (let i = 0; i < files.length; i++) {
    for (let variable of files[i].variables) {
      myCustomFiles[i].__set__(variable, variable === 'Prompt' ? userPrompt(type) : customFilesMap[variable])
    }
  }
  return myCustomFiles[myCustomFiles.length - 1]
}

let userPromptMappingFunc = wrapMyFunc([{name: 'Authentify', variables: ['Prompt']}, {name: 'user', variables: ['Authentify']}])

/* defining a spy and its init + restore for each test */
let spy

beforeEach(() => {
  spy = sinon.spy(console, 'log')
})

afterEach(() => {
  console.log.restore()
})

/* TEST */
describe('USER', function () {
  it('register', done => {
    let Program = rewire('commander')
    userPromptMappingFunc('register')(Program)
    .then(token => {
      expect(token).to.be.a('string')
      done()
    })
    .catch(err => {
      expect(err.message).to.equal('😱   user testTravis already exists')
      done()
    })
    Program.parse(['node', '../.', 'user', 'register'])
  })
  it('logout', done => {
    let Program = rewire('commander')
    Lib.user(Program)
    .then(() => {
      let args = spy.args[spy.args.length - 1][spy.args[spy.args.length - 1].length - 1]
      expect(args).to.include('disconnected')
      done()
    })
    .catch(err => {
      expect(err.message).to.equal('error')
      done()
    })
    Program.parse(['node', '../.', 'user', 'logout'])
  })
  it('login', done => {
    let Program = rewire('commander')
    userPromptMappingFunc('login')(Program)
    .then(token => {
      expect(token).to.be.a('string')
      done()
    })
    .catch(err => {
      expect(err.message).to.equal('error')
      done()
    })
    Program.parse(['node', '../.', 'user', 'login'])
  })
  it('info', done => {
    let Program = rewire('commander')
    Lib.user(Program)
    .then(() => {
      let args = spy.args[spy.args.length - 1][spy.args[spy.args.length - 1].length - 1]
      expect(args).to.include('email: test2@travis.com')
      done()
    })
    .catch(err => {
      expect(err).to.equal(undefined)
      done()
    })
    Program.parse(['node', '../.', 'user', 'info'])
  })
  // it('logout', done => {
  //   let Program = rewire('commander')
  //   Lib.user(Program)
  //   .then(() => {
  //     let args = spy.args[spy.args.length - 1][spy.args[spy.args.length - 1].length - 1]
  //     expect(args).to.include('disconnected')
  //     done()
  //   })
  //   .catch(err => {
  //     expect(err.message).to.equal('error')
  //     done()
  //   })
  //   Program.parse(['node', '../.', 'user', 'logout'])
  // })
})
