let Preferences = require('preferences')
let Common = require('../../../lib/common')
let CONST = require('../../../lib/const')

/* MODULE */
class Module {
  constructor (create) {
    this.name = create.name
    this.version = create.version
    this.author = create.author
    this.style = create.style
    this.type = create.type
    this.mainClass = create.mainClass
    this.description = create.description
    this.jsStandard = create.jsStandard
    this.category = create.category
    this.responsive = create.responsive
    this.keywords = create.keywords
    this.dependencies = {}
    this.files = {}
    if (create.htmlName) { this.files.index = create.htmlName }
    this.files.script = create.jsName
    this.files.style = create.ssName
    this.classes = create.classes
    this.readme = create.readme
    this.repository = create.repository
    this.license = create.license
    this.contributors = create.contributors
  }
}

/* CREATE object */
class Create {
  constructor (name, options) {
    this.initialPath = Common.getCurrentPath()
    let defaultValues = {
      name: name,
      version: '1.0.0',
      author: new Preferences(CONST.PREFERENCES).user || 'anonymous',
      style: 'css',
      type: 'native',
      mainClass: name,
      description: '',
      jsStandard: 'legacy',
      category: '',
      responsive: ['mobile', 'phablet', 'tablet', 'laptop', 'screenXl'],
      keywords: [],
      htmlName: `${name}.html`, // if not in project's scope
      jsName: `${name}.js`,
      ssName: `${name}.${options.style || 'css'}`,
      classes: [],
      readme: '',
      repository: '',
      license: 'MIT',
      contributors: [],
      debug: false,
      default: false,
      force: false,
      flat: false
    }
    for (let key in defaultValues) {
      this[key] = typeof options[key] === 'function'
      ? defaultValues[key]
      : options[key] || defaultValues[key]
    }
    this.options = options
    this.warnings = []
    this.successes = []
  }

  /* keys used in the create prompter */
  getKeys () {
    return ['version', 'style', 'mainClass', 'description', 'jsStandard', 'category', 'repository', 'readme', 'license', 'keywords', 'classes', 'htmlName', 'ssName', 'jsName']
  }
}

/* PUBLISH object */
class Publish {
  constructor (name, options) {
    this.name = name
    this.version = typeof options.version === 'function' ? null : options.version
    this.initialPath = Common.getCurrentPath()
    this.debug = options.debug || false
    this.force = options.force || false
    this.access = options.access
    this.noJs = options.js === false
    this.htmlChecker = options.htmlChecker
    this.jsImports = []
    this.warnings = []
    this.successes = []
  }
}

/* INSTALL object */
class Install {
  constructor (names, options) {
    this.isRegistry = options.registry !== undefined
    this.isLocal = options.local !== undefined
    this.isSave = options.save !== undefined
    this.isDev = options.dev !== undefined
    this.isProd = options.prod !== undefined
    this.isForce = options.force !== undefined
    this.jsStandard = options.jsStandard || null
    this.names = names
    this.style = options.style
    this.pathInitial = null
    this.pathProject = null
    this.pathModule = null
    this.pathModules = null
    this.pathRegistry = null
    this.pathFinal = null
    this.pathJson = null
    this.dependencies = {}
    this.downloadList = []
    this.symlinkList = []
    this.finalInstances = []
    this.downloadPromises = []
    this.symlinkPromises = []
    this.directoryList = []
    this.warnings = []
    this.successes = []
    this.stats = { addedNumber: 0 } // need to have a pointer so all dependencies can update it
    this.debug = options.debug === true // || CONST.DEBUG
  }
  /* creates a list of dependencies if install has args */
  addDependenciesNames (names) {
    for (let name of names) {
      if (name.indexOf('@') > 0) {
        this.dependencies[name.split('@')[0]] = name.split('@')[1]
      } else {
        this.dependencies[name] = true
      }
    }
  }
}

module.exports = {
  Module,
  Create,
  Publish,
  Install
}
