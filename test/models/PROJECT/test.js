let Fs = require('fs')
let sinon = require('sinon')
let rewire = require('rewire')
let expect = require('chai').expect
let projectLib = require('../../../src/models/project')
const cmd = '../../../src/spm'
let Common = require('../../../src/lib/common')
let testCommon = require('../../lib/common')

/* TEST */
module.exports = (dir) => {
  it('prepare test workSpace', done => {
    testCommon.prepareWorkspacePromise(`${dir}/test/models/PROJECT`, 'files')
    .then(() => done())
    .catch(console.log)
  })
  it('create', done => {
    process.chdir(`${dir}/test/models/PROJECT`)
    Fs.mkdir('./files', err => {
      if (!err || err.code === 'EEXIST') {
        process.chdir('files')
        let Program = rewire('commander')
        projectLib.create(Program)
        .then(() => {
          Fs.readdir('../files', (err, files) => {
            if (err) { console.log(err) }
            const expectedFiles = ['environment.js', 'index.html', 'project-spm.json', 'script.js', 'style.css', 'styleguide.css', 'variables-spm.css']
            for (let file of expectedFiles) { expect(files).to.include(file) }
            Common.getJsonFilePromise('project-spm.json')
            .then(json => {
              expect(json).to.have.all.keys('name', 'style', 'type', 'files', 'description', 'jsStandard', 'dependencies')
              expect(json.name).to.equal('files')
              done()
            })
            .catch(console.log)
          })
        })
        .catch(console.log)
        Program.parse([cmd, 'project', 'create', '--default'])
      }
    })
  })
  it('edit', done => {
    sinon.spy(console, 'log')
    let Program = rewire('commander')
    projectLib.edit(Program)
    .then(() => {
      let args = console.log.args[console.log.args.length - 2][console.log.args[console.log.args.length - 1].length - 1]
      console.log.restore()
      expect(args).to.includes(`project's key style successfully updated to scss`)
      done()
    })
    .catch(console.log)
    Program.parse([cmd, 'project', 'edit', '--style', 'scss'])
  })
  it('detail', done => {
    sinon.spy(console, 'log')
    let Program = rewire('commander')
    projectLib.detail(Program)
    .then(() => {
      let args = console.log.args[console.log.args.length - 1][console.log.args[console.log.args.length - 1].length - 1]
      console.log.restore()
      expect(args).to.equal(`{\n  "name": "files",\n  "style": "scss",\n  "type": "native",\n  "files": {\n    "index": "index.html",\n    "script": "script.js",\n    "style": "style.css",\n    "styleguide": "styleguide.css"\n  },\n  "description": "",\n  "jsStandard": "legacy",\n  "dependencies": {}\n}`)
      done()
    })
    .catch(console.log)
    Program.parse([cmd, 'project', 'detail'])
  })
  it('clean test workSpace', done => {
    testCommon.cleanWorkspacePromise(`${dir}/test/models/PROJECT/files`)
    .then(() => done())
    .catch(console.log)
  })
}
