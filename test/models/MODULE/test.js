let Fs = require('fs')
let sinon = require('sinon')
let rewire = require('rewire')
let expect = require('chai').expect
let moduleLib = require('../../../src/models/module')
const cmd = '../../../src/spm2'
let Common = require('../../../src/lib/common')
let testCommon = require('../../lib/common')

/* TEST */
module.exports = (dir) => {
  it('prepare test workSpace', done => {
    testCommon.prepareWorkspacePromise(`${dir}/test/models/MODULE`, 'files')
    .then(() => done())
    .catch(console.log)
  })
  it('create', done => {
    let Program = rewire('commander')
    moduleLib.create(Program)
    .then(() => {
      Fs.readdir('testModule', (err, files) => {
        if (err) { console.log(err) }
        const expectedFiles = ['const-spm.js', 'testModule.html', 'module-spm.json', 'testModule.js', 'testModule.css', 'variables-spm.css']
        for (let file of expectedFiles) { expect(files).to.include(file) }
        Common.getJsonFilePromise('testModule/module-spm.json')
        .then(json => {
          expect(json).to.have.all.keys('name', 'version', 'style', 'type', 'author', 'files', 'mainClass', 'category', 'description', 'jsStandard', 'repository', 'readme', 'responsive', 'dependencies', 'license', 'keywords', 'contributors', 'classes')
          expect(json.name).to.equal('testModule')
          done()
        })
        .catch(console.log)
      })
    })
    .catch(console.log)
    Program.parse([cmd, 'module', 'create', 'testModule', '--default'])
  })
  it('edit', done => {
    process.chdir('testModule')
    sinon.spy(console, 'log')
    let Program = rewire('commander')
    moduleLib.edit(Program)
    .then(() => {
      let args = console.log.args[console.log.args.length - 2][console.log.args[console.log.args.length - 1].length - 1]
      console.log.restore()
      expect(args).to.includes(`module's key mainClass successfully updated to moduleTest`)
      done()
    })
    .catch(console.log)
    Program.parse([cmd, 'module', 'edit', '--main-class', 'moduleTest'])
  })
  it('detail', done => {
    sinon.spy(console, 'log')
    let Program = rewire('commander')
    moduleLib.detail(Program)
    .then(() => {
      let args = console.log.args[console.log.args.length - 1][console.log.args[console.log.args.length - 1].length - 1]
      console.log.restore()
      expect(args).to.equal('{\n  "name": "testModule",\n  "version": "1.0.0",\n  "author": "testTravis",\n  "style": "css",\n  "type": "native",\n  "mainClass": "moduleTest",\n  "description": "",\n  "jsStandard": "modular",\n  "category": "",\n  "responsive": [],\n  "keywords": [],\n  "dependencies": {},\n  "files": {\n    "index": "testModule.html",\n    "script": "testModule.js",\n    "style": "testModule.css"\n  },\n  "classes": [],\n  "readme": "",\n  "repository": "",\n  "license": "MIT",\n  "contributors": []\n}')
      done()
    })
    .catch(console.log)
    Program.parse([cmd, 'module', 'detail'])
  })
  it('publish', done => {
    Fs.writeFile('testModule.html', '<h2 class="moduleTest">B</h2>', err => {
      if (err) { console.log(err) }
      Fs.writeFile('testModule.css', '.moduleTest {color: red;}', err => {
        if (err) { console.log(err) }
        Fs.writeFile('testModule.js', 'let $_x = 32;console.log($_x)', err => {
          if (err) { console.log(err) }
          sinon.spy(console, 'log')
          let Program = rewire('commander')
          moduleLib.publish(Program)
          .then(() => {
            let args = console.log.args[console.log.args.length - 2][console.log.args[console.log.args.length - 1].length - 1]
            console.log.restore()
            expect(args).to.includes('testTravis_testModule@1.0.0 has been successfully created')
            done()
          })
          .catch(console.log)
          Program.parse([cmd, 'module', 'publish', '--version', '1.0.0', '--force'])
        })
      })
    })
  })
  it('clone', done => {
    sinon.spy(console, 'log')
    let Program = rewire('commander')
    moduleLib.clone(Program)
    .then(() => {
      let args = console.log.args[console.log.args.length - 2][console.log.args[console.log.args.length - 1].length - 1]
      console.log.restore()
      expect(args).to.includes('testTravis_testModule source files imported in testTravis_testModule folder')
      // should ask interceptor to create folder and test it with further logic
      done()
    })
    .catch(console.log)
    Program.parse([cmd, 'module', 'clone', 'testTravis_testModule'])
  })
  it('clean test workSpace', done => {
    testCommon.cleanWorkspacePromise(`${dir}/test/models/MODULE/files/testModule`)
    .then(() => done())
    .catch(console.log)
  })
}
