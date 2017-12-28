/* READLINE */

let EventEmitter = require('events').EventEmitter
let sinon = require('sinon')
let util = require('util')
let _ = require('lodash')

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
    console.log(actions[i], 'GAGAGA')
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
          break
      }
    }
  }
  ui.rl.emit('line')
}

let autosubmit = (i, ui, actions) => {
  console.log()
  ui.process.subscribe(() => {
    i++
    setTimeout(() => {
      action(i, ui, actions)
    }, 5)
  })
  action(i, ui, actions)
}

let wrapper = (ui, actions) => {
  let index = 0
  autosubmit(index, ui, actions)
}

module.exports = wrapper
