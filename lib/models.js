/******************************************************************************/
/*  NAME FILE : models.js
/*  DESCRIPTION : All object models contained in the project
/*
/*  DEPENDENCIES:
/*    - Common ( lib/common )
/*
/*  MODELS
/*    - PackageSpm
/*    - Install
/*    - Publish
/*
/******************************************************************************/

/* INIT */
class PackageSpm {
  constructor (result, nopublish) {
    this.nopublish = nopublish || false
    this.name = null
    this.version = null
    this.style = null
    this.main = null
    this.scripts = {
      'test': 'echo "Error = no test specified" && exit 1'
    }
    this.author = null
    this.license = null
    this.keywords = null
    this.description = null
    this.dependencies = {}
    for (let key in result) {
      if (key === 'keywords' ||
        key === 'contributors' ||
        key === 'variables' ||
        key === 'extends' ||
        key === 'classes') {
        this[key] = []
        for (let item of result[key].split(/[ ,]+/)) {
          if (item !== '') { this[key].push(item) }
        }
      } else {
        this[key] = result[key]
      }
    }
    // to be deleted with new types
    this.type = 'native'
    this.warnings = []
    this.successes = []
    this.errors = []
  }
}

/* INSTALL */
class Install {
  constructor (options, names) {
    this.isRegistry = options.registry !== undefined
    this.isLocal = options.local !== undefined
    this.isSave = options.save !== undefined
    this.isDev = options.dev !== undefined
    this.isProd = options.prod !== undefined
    this.isForce = options.force !== undefined
    this.isSudo = options.sudo !== undefined
    this.names = names
    this.style = options.scss === true ? 'scss' : 'css'
    this.pathProject = null
    this.pathPackage = null
    this.pathModules = null
    this.pathRegistry = null
    this.infoMessages = []
    this.current = {
      arborescence: {},
      jsonFile: {
        dependencies: {}
      }
    }
    this.downloadList = []
    this.symlinkList = []
    this.instanceList = []
    this.downloadPromises = []
    this.symlinkPromises = []
    this.instancePromises = []
    this.directoryList = []
    this.warnings = []
    this.successes = []
    this.errors = []
  }
}

/* PUBLISH */
class Publish {
  constructor (moduleName, version) {
    this.name = moduleName
    this.version = version
    this.ressources = []
    this.warnings = []
    this.successes = []
    this.errors = []
  }
}

/* publish package sent to spm registry */
class PublishPackageSpm {
  constructor (
    name,
    version,
    type,
    style,
    main,
    classes,
    description,
    entry,
    dependencies,
    scripts,
    repository,
    readme,
    keywords,
    engines,
    license,
    dom,
    responsiveness,
    category) {
    this.name = name
    this.version = version
    this.type = type
    this.style = style
    this.main = main
    this.classes = classes
    this.description = description
    this.entry = entry
    this.dependencies = dependencies
    this.scripts = scripts
    this.repository = repository
    this.readme = readme
    this.keywords = keywords
    this.engines = engines
    this.license = license
    this.dom = dom
    this.responsiveness = responsiveness
    this.category = category
  }
}

/* GENERATE */
class Generate {
  constructor (name, nickname, options, path) {
    this.name = name
    this.nickname = nickname
    this.initialPath = path
    this.style = options.scss === true ? 'scss' : 'css'
    this.path = path
    this.modules = []
    this.classes = []
    this.rename = options.rename === true
    this.use = options.use || false
    this.classTarget = options.class === true
    this.isForce = options.force === true
    this.warnings = []
    this.successes = []
    this.errors = []
  }
}

/* USE */
class Use {
  constructor (instances, options, path) {
    this.instances = instances
    this.targetModule = options.module != null
    this.modules = !options.module || options.module === true ? [] : [options.module]
    this.targetClass = options.class != null
    this.classes = !options.class || options.class === true ? [] : [options.class]
    this.targetPath = options.path != null
    this.path = path
    this.initialPath = path
    this.style = options.scss === true ? 'scss' : 'css'
    if (options.path === true) {
      this.usePathes = []
    } else if (options.path === undefined) {
      this.usePathes = options.path
    } else {
      this.usePathes = []
      for (let item of options.path) {
        if (!item.startsWith('/') && !item.startsWith('.')) {
          this.usePathes.push(`./${item}`)
        } else {
          this.usePathes.push(item)
        }
      }
    }
    this.warnings = []
    this.successes = []
    this.errors = []
  }
}

module.exports = {
  PackageSpm,
  Install,
  Publish,
  PublishPackageSpm,
  Generate,
  Use
}
