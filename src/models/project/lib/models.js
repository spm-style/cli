let Common = require('../../../lib/common')

/* PROJECT */
class Project {
  constructor (create) {
    this.name = create.name
    this.style = create.style
    this.type = create.type
    this.files = {
      index: create.htmlName,
      script: create.jsName,
      style: create.ssName,
      styleguide: create.styleguideName
    }
    this.description = create.description
    this.jsStandard = create.jsStandard
    this.dependencies = {}
  }
}

/* CREATE object */
class Create {
  constructor (options) {
    this.initialPath = Common.getCurrentPath()
    let defaultValues = {
      name: Common.getCurrentDirectory(),
      style: 'css',
      type: 'native',
      htmlName: 'index.html',
      jsName: 'script.js',
      ssName: `style.${options.style || 'css'}`,
      styleguideName: `styleguide.${options.style || 'css'}`,
      description: '',
      jsStandard: 'legacy',
      debug: false,
      default: false,
      force: false
    }
    for (let key in defaultValues) {
      this[key] = typeof options[key] === 'function'
      ? defaultValues[key]
      : options[key] || defaultValues[key]
    }
    this.options = options
    this.warnings = []
    this.successes = []
    this.errors = []
  }
  /* keys used in the create prompter */
  getKeys () {
    return ['name', 'style', 'htmlName', 'jsName', 'ssName', 'styleguideName', 'description', 'jsStandard'] // no type
  }
}

module.exports = {
  Project,
  Create
}
