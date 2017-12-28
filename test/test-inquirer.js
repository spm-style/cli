let expect = require('chai').expect
let Wrapper = require('./inquirer-input-wrapper')
let sinon = require('sinon')
let rewire = require('rewire')
let inquirer = require('inquirer')

/* MODIFYING THE FILE FOR BETTER PROMPT */
let actions2 = [['down', 'space'], ['space', 'down', 'space']]
let myCustomUse = rewire('./use-test')
let tmpCpy = inquirer.prompt.bind({})
tmpCpy.prompt = questions => {
  let myPromise = inquirer.prompt(questions)
  Wrapper(myPromise.ui, actions2)
  return myPromise
}
inquirer.prompt = tmpCpy
myCustomUse.__set__('Prompt', tmpCpy.prompt)
/****************/

sinon.spy(console, 'log')

describe('`checkbox` prompt', function () {
  it('should return a single selected choice in an array', function (done) {
    myCustomUse.test(0)
    .then(() => {
      expect(console.log.calledWith('success a')).to.equal(true)
      console.log.restore()
      done()
    })
    .catch(console.log)
  })
})
