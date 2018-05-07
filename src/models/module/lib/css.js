let Fs = require('fs')
let Path = require('path')
let Sass = require('node-sass')
let Prompt = require('inquirer').prompt
let Debug = require('../../../lib/debug')
let Common = require('../../../lib/common')
let CONST = require('../../../lib/const')

const SCSS_IGNORED_CHARS = [' ', '\n', '\t']
const SCSS_END_CHARS = [' ', '\n', '\t', '.', '[', '{', '&', ':', ',', ';']

/* whitespaces cleaner for strings */
let removeWhitespaces = (str) => {
  if (str.length) {
    let i = 0
    while (str[i] === ' ') {
      i++
    }
    let j = str.length - 1
    while (str[j] === ' ') {
      j--
    }
    if (j !== 0) {
      return str.substring(i, j + 1)
    }
  }
  return str
}

/* removes comment and other neutral characters from css */
let cssCleaner = (str) => {
  if (!str || !str.length) { return str }
  let startIndex = 0
  let i, j
  while ((i = str.indexOf('/*', startIndex)) >= 0) {
    let j = str.indexOf('*/', i)
    if (j < 0) { return str }
    str = `${str.substring(0, i)}${str.substring(j + 2)}`
    startIndex = i + 1
  }
  i = 0
  while (i < str.length) {
    if (SCSS_IGNORED_CHARS.includes(str[i])) {
      j = 1
      while (SCSS_IGNORED_CHARS.includes(str[i + j])) { j++ }
      str = `${str.substring(0, i)} ${str.substring(i + j)}`
    }
    i++
  }
  return removeWhitespaces(str)
}

/* checks if a given selector has a valid scope included inside one of the publication's classes */
let parseSelector = (selector, classes, dependenciesMap) => {
  let item
  if (selector.indexOf(' ') >= 0) {
    let table = selector.split(' ')
    let i = 0
    if (i >= table.length) { return null } else { item = table[i] }
  } else { item = selector }
  let allClasses = classes.concat(Object.keys(dependenciesMap))
  for (let moduleClass of allClasses) {
    let i = item.indexOf('.' + moduleClass)
    if (i >= 0 &&
      ((i + moduleClass.length + 1 === item.length) || SCSS_END_CHARS.includes(item[i + moduleClass.length + 1]))) {
      return item
    }
  }
  return null
}

/* checks publication can't impact external elements with a larger-scoped selector */
let parseSelectors = (data, classes, dependenciesMap) => {
  let parsed = data.split(',')
  for (let selector of parsed) {
    selector = removeWhitespaces(selector)
    if (!selector.startsWith('@') && !parseSelector(selector, classes, dependenciesMap)) {
      return false
    }
  }
  return true
}

/* high level scope checker for css file */
let checkClass = (file, data, publish) => {
  if (publish.debug) { Debug() }
  return new Promise((resolve, reject) => {
    data = cssCleaner(data)
    let startIndex = 0
    let i, j
    let tmpClasses = publish.json.classes.concat([publish.json.mainClass])
    while ((i = data.indexOf('@import', startIndex)) >= 0) { startIndex = data.indexOf(';', i) + 1 }
    while (startIndex >= 0 && (i = data.indexOf('@mixin', startIndex)) >= 0) {
      startIndex = data.indexOf('{', i) + 1
      let count = 0
      while (startIndex < data.length &&
        (data[startIndex] !== '}' || count > 0)) {
        if (data[startIndex] === '{') { count++ }
        if (data[startIndex] === '}') { count-- }
        startIndex++
      }
      startIndex++
    }
    let undeclaredClasses = []
    let unscopedSelectors = []
    let usedClasses = {}
    let acceptedClasses = tmpClasses.concat(Object.keys(publish.dependenciesClassesMapping))
    let count = 0
    while ((i = data.indexOf('{', startIndex)) >= 0) {
      j = [data.indexOf('@media', startIndex), data.indexOf('@document', startIndex), data.indexOf('@supports', startIndex)].filter(x => x >= 0)
      j = !j.length ? -1 : Math.min(...j)
      if (j < 0 || i < j) {
        if (!parseSelectors(data.substring(startIndex, i), tmpClasses, publish.dependenciesClassesMapping) && Common.cleanValue(data.substring(startIndex, i)) !== ':root') {
          // convert in css before making any check
          unscopedSelectors.push({ value: Common.cleanValue(data.substring(startIndex, i)), file })
        }
        // checks the use of undeclared classes
        for (let selector of data.substring(startIndex, i).split(',')) {
          selector = Common.cleanValue(selector)
          let selectorStartIndex = selector.indexOf('.')
          let selectorStopIndex = selectorStartIndex + 1
          while (selectorStopIndex !== selector.length && !SCSS_END_CHARS.includes(selector[selectorStopIndex])) {
            selectorStopIndex++
          }
          let subSelector = selector.substring(selectorStartIndex + 1, selectorStopIndex)
          if (!acceptedClasses.includes(subSelector) && !undeclaredClasses.includes(subSelector)) { undeclaredClasses.push(subSelector) } else { usedClasses[subSelector] = true }
        }
        i = data.indexOf('}', i)
        while (count) {
          i = data.indexOf('}', i + 1)
          count--
        }
      } else { count++ }
      startIndex = i + 1
    }
    publish.unusedClasses = {}
    for (let projectClass of publish.json.classes) {
      if (!usedClasses[projectClass]) { publish.unusedClasses[projectClass] = true }
    }
    if (undeclaredClasses.length + unscopedSelectors.length) {
      let errorMessage = ''
      if (unscopedSelectors.length) {
        errorMessage = 'incorrect selectors found  - not containing any declared class:\n'
        for (let unscopedSelector of unscopedSelectors) {
          errorMessage += `- ${unscopedSelector.value} in file ${unscopedSelector.file}\n`
        }
      }
      if (undeclaredClasses.length) {
        errorMessage += `undeclared classes found : ${undeclaredClasses.join(', ')}\n=> use spm module edit --classes '${undeclaredClasses.join(',')}'`
      }
      return reject(new Error(errorMessage))
    }
    return resolve(publish)
  })
}

/* Information parser from @import tags */
let importToFile = (data) => {
  if (data.length > 2) {
    if (data.startsWith("'") &&
      data.split("'").length === 3 &&
      data.split("'")[0] === '') {
      return data.split("'")[1]
    }
    if (data.startsWith('"') &&
      data.split('"').length === 3 &&
      data.split('"')[0] === '') {
      return data.split('"')[1]
    }
    if (data.startsWith('url(') && data.indexOf(')') > 5) {
      return importToFile(data.substring(4, data.indexOf(')')))
    }
  }
  return null
}

/* Checks all import found from the entry file are included in the project */
let recursiveCheckModule = (filePath, publish) => {
  if (publish.debug) { Debug() }
  return new Promise((resolve, reject) => {
    if (Path.relative(publish.path, filePath).startsWith('..')) { return reject(new Error(`imported file ${filePath} out of module's scope`)) }
    Fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) { return reject(err) }
      publish.ressources.push(filePath)
      let dataAt = data.split('@import ')
      let dataAtClose = []
      for (let elem of dataAt) {
        if (elem.indexOf(';') >= 0) {
          let resultFile = importToFile(elem.split(';')[0])
          if (resultFile && !resultFile.startsWith('http')) {
            dataAtClose.push(resultFile)
          }
        }
      }
      let promises = []
      for (let module of dataAtClose) {
        promises.push(recursiveCheckModule(Path.join(Path.dirname(filePath), module), publish))
      }
      Promise.all(promises)
      .then(() => { return resolve(publish) })
      .catch(reject)
    })
  })
}

/* Convert the project to css if needed in order to check selectors' scope */
let scssToCssForCheck = (publish) => {
  if (publish.debug) { Debug() }
  return new Promise((resolve, reject) => {
    if (publish.json.style === 'scss') {
      Fs.writeFile(Path.join(publish.path, '.tmp_spm', '.sass_spm', 'style.scss'), `@import '../${publish.json.files.style}';`, err => {
        if (err) { return reject(err) }
        Sass.render({
          file: Path.join(publish.path, '.tmp_spm', '.sass_spm', 'style.scss'),
          outFile: Path.join(publish.path, '.tmp_spm', '.sass_spm', 'result.css')
        }, function (error, result) {
          if (!error) {
            Fs.writeFile(Path.join(publish.path, '.tmp_spm', '.sass_spm', 'result.css'), result.css, function (err) {
              if (!err) {
                checkClass(Path.join(publish.path, '.tmp_spm', '.sass_spm', 'result.css'), result.css.toString(), publish)
                .then(() => resolve(publish))
                .catch(reject)
              } else { return reject(new Error('error while converting scss file to css')) }
            })
          } else { return reject(error.message) } // node-sass error message
        })
      })
    } else {
      Fs.readFile(Path.join(publish.path, '.tmp_spm', publish.json.files.style), 'utf8', (err, data) => {
        if (err) { return reject(err) }
        checkClass(Path.join(publish.path, '.tmp_spm', publish.json.files.style), data, publish)
        .then(() => resolve(publish))
        .catch(reject)
      })
    }
  })
}

/* To confirm the deletion of declared and unused dependencies */
let confirmDependancyRemoval = (publish) => {
  if (publish.debug) { Debug() }
  return new Promise((resolve, reject) => {
    if (Object.keys(publish.removed).length && !publish.force) {
      let questions = [
        {
          type: 'checkbox',
          name: 'keeping',
          message: 'spm has detected the following unused dependancies - which one do you want to keep ?\n',
          choices: Object.keys(publish.removed)
        }
      ]
      Prompt(questions)
      .then(answer => {
        let removed = {}
        for (let item in publish.removed) {
          if (!(answer.keeping).includes(item)) {
            removed[item] = publish.dependencies[item]
            delete publish.dependencies[item]
          }
        }
        publish.removed = removed
        return resolve(publish)
      })
      .catch(reject)
    } else {
      return resolve(publish)
    }
  })
}

/* Some dependency can be declared and not used */
let unusedDependencies = (publish) => {
  if (publish.debug) { Debug() }
  return new Promise((resolve, reject) => {
    let dependencies = Object.assign({}, publish.dependencies)
    let removed = {}
    for (let dependency in dependencies) {
      let flag = false
      for (let ressource of publish.ressources) {
        if (Path.relative(Path.join(publish.path, 'spm_modules', dependency), Path.dirname(ressource)) === '') {
          flag = true
          break
        }
      }
      if (!flag) {
        publish.warnings.push(`dependency ${dependency} is not used`)
        removed[dependency] = dependencies[dependency]
      }
    }
    publish.removed = removed
    confirmDependancyRemoval(publish)
    .then(resolve)
    .catch(reject)
  })
}

/* removes the files creted for scss check */
let clearspmModulesTmpPromise = (publish) => {
  if (publish.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Common.deleteFolderRecursivePromise(Path.join(publish.path, '.tmp_spm', '.sass_spm'), true)
    .then(() => { return resolve(publish) })
    .catch(reject)
  })
}

/* css checker */
let fileCheckerPromise = (publish) => {
  if (publish.debug) { Debug() }
  return new Promise((resolve, reject) => {
    publish.ressources = []
    recursiveCheckModule(Path.join(publish.path, publish.json.files.style), publish)
    .then(scssToCssForCheck)
    .then(unusedDependencies)
    .then(clearspmModulesTmpPromise)
    .then(resolve)
    .catch(reject)
  })
}

/* after installation, default values initialized for potential instances */
let defineParametersOrderPromise = (install) => {
  if (install.debug) { Debug() }
  return new Promise((resolve, reject) => {
    try {
      Fs.readFile(Path.join(install.target, install.files.style), 'utf8', (err, data) => {
        if (err && err !== 'ENOENT') { return reject(err) } else if (err) { return reject(new Error(`incorrect entry file in module ${install.name}@${install.version}`)) }
        let i = data.indexOf(`@mixin ${install.jsonFile.mainClass}(`)
        i = i + `@mixin ${install.jsonFile.mainClass}(`.length
        let j = data.indexOf(')', i)
        let k
        install.ssParameters = []
        install.ssDefaultMapping = {}
        for (let moduleClass of install.jsonFile.classes) {
          for (let classVariable of moduleClass.variables) {
            install.ssDefaultMapping[classVariable.name] = classVariable.value
          }
        }
        while ((k = data.indexOf(',', i)) >= 0 && k < j) {
          if (data.substring(i, k).startsWith('$_') && !data.substring(i, k).startsWith('$_local-')) {
            install.ssParameters.push(data.substring(i + 2, k))
          }
          i = k + 1
        }
        return resolve(install)
      })
    } catch (err) {
      return reject(err)
    }
  })
}

/* updates main style file with instance import */
let updateStyleFilePromise = (item) => {
  return new Promise((resolve, reject) => {
    console.log(item.pathFinal, item.jsonFile.files.style)
    Fs.readFile(Path.join(item.pathFinal, item.jsonFile.files.style), 'utf8', (err, data) => {
      if (err && err.code !== 'ENOENT') { return reject(err) }
      let path = Path.relative(Path.dirname(Path.join(item.pathFinal, item.jsonFile.files.style)), Path.join(item.pathFinal, CONST.INSTANCE_FOLDER, item.jsonFile.style === 'scss' ? CONST.INSTANCE_FOLDER + '.scss' : '.' + CONST.INSTANCE_FOLDER + '.css'))
      if (data.indexOf(`@import "${path}";\n`) === -1) {
        let startIndex = -1
        let stopIndex = 0
        while ((startIndex = data.indexOf('@import', startIndex + 1)) !== -1) {
          stopIndex = data.indexOf(';', startIndex)
        }
        stopIndex = !stopIndex ? stopIndex : stopIndex + 1
        data = `${data.substring(0, stopIndex)}@import "${path}";\n${data.substring(stopIndex)}`
        Fs.writeFile(Path.join(item.pathFinal, item.jsonFile.files.style), data, err => {
          if (err) { return reject(err) }
          return resolve(item)
        })
      } else { return resolve(item) }
    })
  })
}

/* updates main instance file */
let processInstancesPromise = (install) => {
  return new Promise((resolve, reject) => {
    Fs.readFile(Path.join(install.pathFinal, CONST.INSTANCE_FOLDER, `${CONST.INSTANCE_FOLDER}.scss`), 'utf8', (err, data) => {
      let importData = ''
      let includeData = ''
      for (let module of install.children) {
        module.variableMap = {}
        module.classParameters = []
        for (let moduleClass of module.jsonFile.classes) {
          module.classParameters.push(moduleClass.name)
          for (let variableItem of moduleClass.variables) { module.variableMap[variableItem.name] = variableItem.value }
        }
        let ssParameters = ''
        let classParameters = ''
        for (let param of module.ssParameters) { ssParameters += `${module.variableMap[param]},` }
        for (let moduleClass of module.classParameters) { classParameters += `'${moduleClass}',` }
        classParameters = classParameters.slice(0, -1)
        if (!data || data.indexOf(`@import '../spm_modules/${module.name}/${module.files.style}';\n`) === -1) {
          importData += `@import '../spm_modules/${module.name}/${module.files.style}';\n`
        }
        includeData += `@include ${module.name}(${ssParameters}${classParameters});\n`
      }

      if (err && err.code !== 'ENOENT') { return reject(err) } else if (err) {
        data = `${importData}\n${includeData}`
      } else {
        let startIndex = 0
        while (data.indexOf('@import ', startIndex) > -1) {
          startIndex = data.indexOf(';', startIndex) + 1
        }
        data = `${data.substring(0, startIndex)}${importData}${data.substring(startIndex)}${includeData}`
      }
      Fs.writeFile(Path.join(install.pathFinal, CONST.INSTANCE_FOLDER, `${CONST.INSTANCE_FOLDER}.scss`), data, err => {
        if (err) { return reject(err) }
        if (install.debug) { console.log('>> (css) updating', Path.join(install.pathFinal, CONST.INSTANCE_FOLDER, `${CONST.INSTANCE_FOLDER}.scss`)) }
        updateStyleFilePromise(install)
        .then(resolve)
        .catch(reject)
      })
    })
  })
}

/* turns a scss file into a css file and removes scss files + map */
let convertScssToCss = (input, output) => {
  return new Promise((resolve, reject) => {
    Sass.render({
      file: input,
      outFile: output
    }, function (err, result) {
      if (err) { return reject(err) }
      Fs.writeFile(output, result.css, err => {
        if (err) { return reject(err) }
        return resolve(output)
      })
    })
  })
}

/* creates or updates the adequate scss instance file plus generates the css if needed */
let generateInstancePromise = (generate) => {
  if (generate.debug) { Debug(generate) }
  return new Promise((resolve, reject) => {
    Fs.readFile(Path.join(generate.pathFinal, 'spm_modules', generate.moduleName, generate.jsonDependency.files.style), 'utf8', (err, data) => {
      try {
        if (err) { return reject(err) }
        let parameters = ''
        let i = data.indexOf('@mixin spm-')
        i = data.indexOf('(', i)
        let j = data.indexOf(')', i)
        for (let parameter of data.substring(i + 1, j).split(',')) {
          parameter = removeWhitespaces(parameter)
          if (parameter.startsWith(CONST.INSTANCE_PREFIX)) {
            if (!generate.variablesMap[parameter.substring(CONST.INSTANCE_PREFIX.length)]) { generate.variablesMap[parameter.substring(CONST.INSTANCE_PREFIX.length)] = `$_${parameter.substring(CONST.INSTANCE_PREFIX.length)}` }
            parameters += `${generate.variablesMap[parameter.substring(CONST.INSTANCE_PREFIX.length)].to || generate.variablesMap[parameter.substring(CONST.INSTANCE_PREFIX.length)].from},`
          } else {
            parameters += `'${generate.nicknames[parameter.substring(13)]}',`
          }
        }
        if (parameters.endsWith(',')) { parameters = parameters.slice(0, -1) }
        Fs.readFile(Path.join(generate.pathFinal, CONST.INSTANCE_FOLDER, `${CONST.INSTANCE_FOLDER}.scss`), 'utf8', (err, data) => {
          if (err && err.code !== 'ENOENT') { return reject(err) } else if (err) {
            data = `@import "../variables-spm.scss";\n@import "../spm_modules/${generate.moduleName}/${generate.jsonDependency.files.style}";\n\n`
          }
          data += `@include ${generate.moduleName}(${parameters});\n`
          Fs.writeFile(Path.join(generate.pathFinal, CONST.INSTANCE_FOLDER, `${CONST.INSTANCE_FOLDER}.scss`), data, err => {
            if (err) { return reject(err) }
            if (generate.style === 'css') {
              convertScssToCss(Path.join(generate.pathFinal, CONST.INSTANCE_FOLDER, `${CONST.INSTANCE_FOLDER}.scss`), Path.join(generate.pathFinal, CONST.INSTANCE_FOLDER, `€{CONST.INSTANCE_FOLDER}.css`))
              .then(res => {
                generate.successes.push(`css instance ${generate.nickname} of module ${generate.moduleName} has been generated`)
                updateStyleFilePromise(generate)
                .then(resolve)
                .catch(reject)
              })
              .catch(reject)
            } else {
              generate.successes.push(`scss instance ${generate.nickname} of module ${generate.moduleName} has been generated`)
              updateStyleFilePromise(generate)
              .then(resolve)
              .catch(reject)
            }
          })
        })
      } catch (err) { return reject(err) }
    })
  })
}

module.exports = {
  fileCheckerPromise,
  defineParametersOrderPromise,
  processInstancesPromise,
  convertScssToCss,
  generateInstancePromise
}
