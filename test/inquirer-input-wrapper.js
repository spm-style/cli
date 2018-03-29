/* READLINE */
let EventEmitter = require('events').EventEmitter
let sinon = require('sinon')
let util = require('util')
let _ = require('lodash')
let rewire = require('rewire') // require returns the same instance of js code every time. use rewire to create new and INDEPENDANT instance

let stub = {}

_.extend(stub, {
  write: sinon.stub().returns(stub),
  moveCursor: sinon.stub().returns(stub),
  setPrompt: sinon.stub().returns(stub),
  close: sinon.stub().returns(stub),
  pause: sinon.stub().returns(stub),
  resume: sinon.stub().returns(stub),
  _getCursorPos: sinon.stub().returns({ cols: 0, rows: 0 }),
  output: {
    end: sinon.stub(),
    mute: sinon.stub(),
    unmute: sinon.stub(),
    __raw__: '',
    write: function (str) {
      this.__raw__ += str
    }
  }
})

let ReadlineStub = function () {
  this.line = ''
  this.input = new EventEmitter()
  EventEmitter.apply(this, arguments)
}

util.inherits(ReadlineStub, EventEmitter)
_.assign(ReadlineStub.prototype, stub)

/* AUTOSUBMIT WRAPPER */

let action = (i, ui, actions) => {
  if (actions && actions.length > i) {
    for (let userAction of actions[i]) {
      switch (userAction) {
        case 'space':
          ui.rl.input.emit('keypress', ' ', { name: 'space' })
          break
        case 'down':
          ui.rl.input.emit('keypress', null, { name: 'down' })
          break
        case 'up':
          ui.rl.input.emit('keypress', null, { name: 'up' })
          break
        default:
          ui.rl.emit('line', userAction)
          break
      }
    }
  }
  ui.rl.emit('line')
}

let autosubmit = (i, ui, actions) => {
  ui.process.subscribe(() => {
    i++
    setTimeout(() => {
      action(i, ui, actions)
    }, 5)
  })
  action(i, ui, actions)
}

let wrapper = (ui, actions, name) => {
  let index = 0
  autosubmit(index, ui, actions)
}

/* calls a different wrapper for each prompt scenario */
let globalPrompt = (type, actions) => questions => {
  let Prompt = require('inquirer').prompt
  let myPromise = Prompt(questions)
  wrapper(myPromise.ui, actions[type])
  return myPromise
}

// /* wrap the lib function depending on a mapping, for each scenario, in strict order */
let wrapMyFunc = (files, model, actions) => type => {
  let myCustomFiles = []
  let customFilesMap = {}
  for (let file of files) {
    myCustomFiles.push(rewire(`../src/models/${model}/${file.path}/${file.name.toLowerCase()}`))
    customFilesMap[file.name] = myCustomFiles[myCustomFiles.length - 1]
  }
  for (let i = 0; i < files.length; i++) {
    for (let variable of files[i].variables) {
      myCustomFiles[i].__set__(variable, variable === 'Prompt' ? globalPrompt(type, actions) : customFilesMap[variable])
    }
  }
  return myCustomFiles[myCustomFiles.length - 1]
}

/* wrapper used for user model */
let globalWrapper = (model, name, actions, config) => {
  return wrapMyFunc(config, model, actions)(name)
}

module.exports = globalWrapper
