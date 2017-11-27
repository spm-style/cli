/******************************************************************************/
/*  NAME FILE : models.js
/*  DESCRIPTION : All object models contained in the project
/*
/*  DEPENDENCIES:
/*    - Common ( lib/common )
/*
/*  MODELS
/*    - Install
/*    - Dependency
/*    - Publish
/*    - PublishPackageSpm
/*
/******************************************************************************/

/** ******** DEPENDENCIES LIB **********/
const Common = require('./common')

/** ******** Init **************************************************/
class PackageSpm {
  constructor (result, nopublish) {
    this.nopublish = nopublish || false
    this.name = null
    this.version = null
    this.style = null
    this.main = null
    this.scripts = {
      'test': 'echo "Error = no test specified" && exit 1' // A VOIR ENSUITE IMPERATIVEMENT
    }
    this.author = null
    this.license = null
    this.keywords = null
    this.description = null
    this.dependencies = {}
    for (let key in result) {
      if (key == 'keywords' ||
				key == 'contributors' ||
				key == 'variables' ||
				key == 'extends' ||
				key == 'classes') {
        this[key] = []
        for (let item of result[key].split(/[ ,]+/)) {
          if (item != '') { this[key].push(item) }
        }
      } else {
        this[key] = result[key]
      }
    }
		// to be deleted with new types
    this.type = 'native'
  }
}

/** ******** Install **************************************************/
class Install {
  constructor (options, names) {
		// this.isGlobal = options.global !== undefined;
    this.isRegistry = options.registry !== undefined
    this.isLocal = options.local !== undefined
    this.isSave = options.save !== undefined
    this.isDev = options.dev !== undefined
    this.isProd = options.prod !== undefined
    this.isForce = options.force !== undefined
	    this.isSudo = options.sudo !== undefined

	    this.names = names

	    this.pathProject = null
	    this.pathPackage = null
	    this.pathModules = null
	    this.pathRegistry = null
			// this.pathGlobal = null;

	    this.warningMessages = []
	    this.infoMessages = []

	    // this.dependencies = null;
	    this.current = {
	    	arborescence: {},
	    	jsonFile: {
	    		dependencies: {}
	    	}
	    }

		// this.projectDependencies = {};

	    // this.jsonContent = null;

    this.downloadList = []
    this.symlinkList = []
    this.instanceList = []
	    this.downloadPromises = []
	    this.symlinkPromises = []
	    this.instancePromises = []
    this.directoryList = []

		// this.arborescence = {};

		// this.jsonContent = null;
  }

  addMessage (type, str, prefix = null) {
    switch (type) {
      case 'warning':
        this.warningMessages.push(str)
        break
      case 'info':
        this.infoMessages.push({prefix: prefix, message: str})
        break
    }
  }

  addProjectDependencies (json) {
    this.jsonContent = json
    this.projectDependencies = json.dependencies
  }

  addDependenciesNames (names) {
    for (let name of names) {
      let tmp = name.split('@')
      if (tmp.length == 2) {
        this.current.jsonFile.dependencies[tmp[0]] = {version: tmp[1]}
      } else {
        this.current.jsonFile.dependencies[tmp[0]] = {version: 'latest'}
      }
    }
  }

  // addDependenciesJson(json){
  //   this.jsonContent = json;
  //   this.dependencies = json.dependencies;
  // }

  getDependenciesKey () {
    if (this.jsonContent != null && this.jsonContent.dependencies != null) {
      return Object.keys(this.jsonContent.dependencies)
    } else {
      return null
    }
  }

  getDependencies () {
    if (this.jsonContent != null && this.jsonContent.dependencies != null) {
      return this.jsonContent.dependencies
    } else {
      return null
    }
  }
}

/** ******** Dependency ***********************************************/
class Dependency {
  constructor (json, parent, nameFind, versionFind) {
    this.name = null
    this.version = null
    this.pathDependency = null
		// this.pathModules = null;
		// this.pathPackage = null;
    this.dependencies = null
    this.dependencyFind = { name: nameFind, version: versionFind }
    this.jsonContent = null
    this.isLink = null
    this.alreadyInstall = null

    if (json) {
      this.name = json.name
      this.version = json.version
      this.jsonContent = json

      if (json.dependencies) {
        this.dependencies = json.dependencies
      }
    }

    if (parent) {
      this.parent = parent
      if (parent.names) {
				// if(parent.isRegistry || parent.isGlobal){
				// 	this.pathDependency = `${parent.pathModules}/${this.name}/${this.version}`;
				// }else{
				// 	this.pathDependency = `${parent.pathModules}/${this.name}`;
				// }
        this.pathDependency = `${parent.pathModules}/${this.name}`
      } else {
        this.pathDependency = `${parent.pathDependency}/spm_modules/${this.name}`
      }
    }
  }

  setPathDependency (path) {
    this.pathDependency = path
  }

  getPathDependency () {
    return this.pathDependency
  }

  getPathModule () {
    return `${this.pathDependency}/spm_modules`
  }

  getPathPackage (version = false) {
    return `${this.pathDependency}/package-spm.json`
  }

  getPathParentModule () {
    if (this.parent.names) {
      return this.parent.pathModules
    } else {
      return this.parent.getPathModule()
    }
  }

	// getPathDependency(version=false){
	// 	if(version){
	// 		return `${this.pathDependency}/${this.version}`;
	// 	}else{
	// 		return this.pathDependency;
	// 	}
	// }
	//
	// getPathModule(version=false){
	// 	if(version){
	// 		return `${this.pathDependency}/${this.version}/spm_modules`;
	// 	}else{
	// 		return `${this.pathDependency}/spm_modules`;
	// 	}
	// }
	//
	// getPathPackage(version=false){
	// 	if(version){
	// 		return `${this.pathDependency}/${this.version}/package-spm.json`;
	// 	}else{
	// 		return `${this.pathDependency}/package-spm.json`;
	// 	}
	// }

  setLink () {
    this.isLink = true
  }

  setAlreadyInstall () {
    this.alreadyInstall = true
  }
}

/** ******** Publication **********************************************/
class Publish {
  constructor (moduleName, version) {
    this.name = moduleName
    this.version = version
    this.ressources = [] // utilisées pour les spm-extend ?
  }

  getKey (key) {
    return this[key]
  }

  setKey (key, value) {
    this[key] = value
  }
}

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

class Use {
  constructor (instances, options, path) {
    this.warnings = []
    this.instances = instances
    this.targetModule = options.module != null
    this.modules = !options.module || options.module === true ? [] : [options.module]
    this.targetClass = options.class != null
    this.classes = !options.class || options.class === true ? [] : [options.class]
    this.targetPath = options.path != null
    this.path = path
    this.initialPath = path
    if (options.path === true) {
      this.usePathes = [];
    } else if (options.path === undefined) {
      this.usePathes = options.path;
    } else {
      this.usePathes = [];
      for (let item of options.path) {
        if (!item.startsWith('/') && !item.startsWith('.')) {
          this.usePathes.push(`./${item}`)
        } else {
          this.usePathes.push(item)
        }
      }
    }
  }
}

class Generate {
  constructor (name, nickname, options, path) {
    this.name = name
    this.nickname = nickname
    this.initialPath = path
    this.path = path
    this.modules = []
    this.classes = []
    this.rename = options.rename === true
    this.use = options.use || false
    this.classTarget = options.class === true
    this.isForce = options.force === true
    this.warnings = [];
  }
}

module.exports = {
  Install,
  Dependency,
  Publish,
  PublishPackageSpm,
  Generate,
  Use,
  PackageSpm
}
