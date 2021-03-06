let Fs = require('fs')
let Path = require('path')
let Acorn = require('acorn')
let Common = require('../../../lib/common')
let Debug = require('../../../lib/debug')
let CONST = require('../../../lib/const')

// const events = ['load']
const assignedEvents = ['onload'] // ( on + event name ?)

/* using acorn to check if the script contains instructions and is correct */
let parseProcessPromise = (publish) => {
  if (publish.debug) { Debug() }
  return new Promise((resolve, reject) => {
    let moduleClassesFound = false
    if (!publish.acorn.body.length) { return reject(new Error(`missing script in ${publish.json.files.script}`)) }
    for (let item of publish.acorn.body) {
      if (item.type === 'VariableDeclaration') {
        for (let declaration of item.declarations) {
          if (declaration.id.name.startsWith(CONST.INSTANCE_PREFIX) && declaration.init === null) {
            return reject(new Error(`ERROR ${declaration.id.name} type instance const not assigned`))
          }
          if (declaration.id.name === 'moduleClasses') {
            moduleClassesFound = true
          }
        }
      } else if (item.type === 'ExpressionStatement' && item.expression.type === 'AssignmentExpression' && (item.expression.left.name && item.expression.left.name.startsWith(CONST.INSTANCE_PREFIX))) {
        return reject(new Error(`ERROR ${item.expression.left.name} type instance const assigned out of declaration`))
      }
    }
    if (!moduleClassesFound) {
      Common.promptConfirmation({}, false, `no class used in module's js script found in your module - are you sure to publish ?`)
      .then(() => resolve(publish))
      .catch(reject)
    } else { return resolve(publish) }
  })
}

/* returns an array potentially containing an error and its location for query selectors */
let errorQuerySelector = (publish, value) => {
  let incorrectSelectors = []
  if (value.type === 'CallExpression' && value.arguments &&
    value.callee && value.callee.type === 'MemberExpression' &&
    value.callee.property && value.callee.property && (value.callee.property.name === 'querySelector' || value.callee.property.name === 'querySelectorAll')) {
    for (let arg of value.arguments) {
      if (arg.type === 'Literal') {
        incorrectSelectors.push(`incorrect ${value.callee.property.name} value ${arg.value} : must contain module's main class (${value.loc.start.line}:${value.loc.start.column})`)
      } else if (arg.type === 'TemplateLiteral' || arg.type === 'BinaryExpression') {
        let selectors = publish.jsData.substring(arg.start, arg.end)
        for (let selector of selectors.split(',')) {
          if (selector.indexOf('moduleClasses.') < 0 && selector.indexOf('moduleClasses[') < 0) {
            incorrectSelectors.push(`incorrect ${value.callee.property.name} value ${selectors} : must contain module's main class (${value.loc.start.line}:${value.loc.start.column})`)
          }
        }
      }
    }
  }
  return incorrectSelectors
}

/* returns an array potentially containing an error and its location for events linked to window */
let errorEvents = (value) => {
  let incorrectEvents = []
  if (value.type === 'MemberExpression' &&
    value.object && value.object.name === 'window' &&
    value.property && assignedEvents.includes(value.property.name)) {
    incorrectEvents.push(`event ${value.property.name} attached to window : please use addEventListener instead (${value.loc.start.line}:${value.loc.start.column})`)
  }
  return incorrectEvents
}

/* recursive controls on script content */
let spmControlRecursivePromise = (publish, value) => {
  return new Promise((resolve, reject) => {
    let promises = []
    if (Array.isArray(value)) {
      for (let item of value) { promises.push(spmControlRecursivePromise(publish, item)) }
    } else if (value && typeof value === 'object') {
      publish.spmControlErrors = publish.spmControlErrors.concat(errorQuerySelector(publish, value)).concat(errorEvents(value))
      for (let item in value) { promises.push(spmControlRecursivePromise(publish, value[item])) }
    }
    Promise.all(promises)
    .then(() => {
      return resolve(publish)
    })
    .catch(reject)
  })
}

/* all controls (query selectors, events, etc...) */
let spmControlPromise = (publish) => {
  return new Promise((resolve, reject) => {
    spmControlRecursivePromise(publish, publish.acorn.body)
    .then(() => {
      if (publish.spmControlErrors.length) { return reject(new Error('\n' + publish.spmControlErrors.join('\n'))) }
      return resolve(publish)
    })
    .catch(reject)
  })
}

/* drives the js checking logic */
let fileCheckerPromise = (publish) => {
  if (publish.debug) { Debug() }
  return new Promise((resolve, reject) => {
    if (publish.noJs) { return resolve(publish) }
    Fs.readFile(Path.join(publish.path, publish.json.files.script), 'utf8', (err, data) => {
      if (err && err.code !== 'ENOENT') { return reject(err) } else if (err || !data.length) {
        Common.promptConfirmation({}, false, 'no js script found in your module - are you publishing a css-only module ?')
        .then(() => resolve(publish))
        .catch(reject)
      } else {
        if (publish.json.jsStandard === 'modular') {
          let modularParsed = Acorn.parse(data, { sourceType: 'module', locations: true })
          for (let index = modularParsed.body.length - 1; index >= 0; index--) {
            let item = modularParsed.body[index]
            if (item.type === 'ImportDeclaration') {
              if (item.source.value.startsWith('http')) { publish.jsImports.push(item.source.value) } else {
                for (let info of item.specifiers) {
                  if (info.type !== 'ImportSpecifier') { return reject(new Error(`to publish for spm, you must import only spm modules or http(s) sources - ${info.local.name} found`)) }
                }
              }
              // import declaration are simply deleted (spm_modules, spm_instances or other)
              data = `${data.substring(0, item.start)}${data.substring(item.end + 1)}`
            } else if (item.type === 'ExportNamedDeclaration') {
              if (item.declaration) {
                for (let subItem of item.declaration.declarations) {
                  if (!subItem.id.name.startsWith('$$_')) {
                    return reject(new Error(`exported variable ${subItem.id.name} not starting with $$_`))
                  } else { data = `${data.substring(0, item.start)}${data.substring(item.end + 1)}` }
                }
              } else {
                return reject(new Error(`exported value must be declared in the export as a variable starting with ${'$$_'}`))
              }
            } else if (item.type.startsWith('Export') && item.type.endsWith('Declaration')) {
              return reject(new Error(`exported value must be declared in the export as a variable starting with ${'$$_'}`))
            }
          }
        }
        publish.jsData = data
        publish.acorn = Acorn.parse(publish.jsData, { locations: true })
        publish.spmControlErrors = []
        spmControlPromise(publish)
        .then(parseProcessPromise)
        .then(() => {
          if (publish.json.jsStandard === 'modular') {
            Fs.writeFile(Path.join(publish.path, '.tmp_spm', publish.json.files.script), data, err => {
              if (err) { return reject(err) }
              return resolve(publish)
            })
          } else { return resolve(publish) }
        })
        .catch(reject)
      }
    })
  })
}

/* LEGACY: gets the file and splits it to integrate sub dependencies inside */
let splitsLegacyFilePromise = (install) => {
  if (install.debug) { console.log('>> ( js)', `analyzing ${Path.join(install.target, install.files.script)}`) }
  return new Promise((resolve, reject) => {
    Fs.readFile(Path.join(install.target, install.files.script), 'utf8', (err, data) => {
      if (err) { return reject(err) }
      let cut = data.indexOf('spm_self) {\n') + 'spm_self) {\n'.length
      if (cut === -1 + 'spm_self) {\n'.length) { return reject(new Error(`incorrect pattern in downloaded ${install.name}@${install.version}`)) }
      install.jsContent.header = data.substring(0, cut)
      install.jsContent.footer = data.substring(cut)
      let prefix = ''
      for (let dependency of install.children) {
        prefix += `${dependency.jsContent.header}${dependency.jsContent.footer}\n`
      }
      if (prefix.length) {
        install.jsContent.footer = `${prefix}${install.jsContent.footer}`
        Fs.writeFile(Path.join(install.target, install.files.script), `${install.jsContent.header}${install.jsContent.footer}`, err => {
          if (err) { return reject(err) }
          if (install.debug) { console.log(`>> ( js) updating ${Path.join(install.target, install.files.script)}`) }
          return resolve(install)
        })
      } else { return resolve(install) }
    })
  })
}

/* processes the javascript part of the instances */
let processInstancesPromise = (install) => {
  if (install.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Fs.readFile(Path.join(install.path || install.pathFinal, CONST.INSTANCE_FOLDER, `${CONST.INSTANCE_FOLDER}.js`), 'utf8', (err, data) => {
      if (err && err.code !== 'ENOENT') { return reject(err) } else if (err) {
        data = ''
      }
      let tmpData = data
      if (install.jsStandard === 'legacy') {
        for (let dependency of install.children) {
          if (dependency.added) {
            let parameters = []
            for (let instanceVar of dependency.jsonFile.js.instancesVar) { parameters.push(`${instanceVar.type === 'string' ? '\'' : ''}${instanceVar.value}${instanceVar.type === 'string' ? '\'' : ''}`) }
            for (let moduleClass of dependency.jsonFile.classes) {
              if (moduleClass.js) { parameters.push(`'${moduleClass.name}'`) }
            }
            data += `let ${dependency.lowerName} = new ${dependency.upperName}(${parameters.join(',')})\n`
          }
        }
      } else {
        for (let dependency of install.children) {
          if (dependency.added) {
            let parameters = []
            for (let instanceVar of dependency.jsonFile.js.instancesVar) { parameters.push(`${instanceVar.type === 'string' ? '\'' : ''}${instanceVar.value}${instanceVar.type === 'string' ? '\'' : ''}`) }
            data = `import { ${dependency.upperName} } from '../spm_modules/${dependency.name}/${dependency.files.script}'\n${data}`
            data += `export let ${dependency.lowerName} = new ${dependency.upperName}(${parameters.join(',')})\n`
          }
        }
      }
      if (data !== tmpData) {
        Fs.writeFile(`${install.path || install.pathFinal}/${CONST.INSTANCE_FOLDER}/${CONST.INSTANCE_FOLDER}.js`, data, err => {
          if (err) { return reject(err) }
          if (install.debug) { console.log('>> ( js) updating', `${Path.join(install.path || install.pathFinal, CONST.INSTANCE_FOLDER, 'CONST.INSTANCE_FOLDER' + '.js')}`) }
          return resolve(install)
        })
      } else { return resolve(install) }
    })
  })
}

/* complete process for sub-dependencies in modular mode */
let processSubInstancesModularPromise = (install) => {
  if (install.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Fs.readFile(Path.join(install.path, CONST.INSTANCE_FOLDER, `${CONST.INSTANCE_FOLDER}.js`), 'utf8', (err, data) => {
      if (err) { return reject(err) }
      let parsed = Acorn.parse(data)
      for (let index = parsed.length - 1; index >= 0; index--) {
        let item = parsed[index]
        if (item.type === 'VariableDeclaration') {
          data = `${data.substring(0, item.start)}export ${data.substring(item.start)}`
        }
      }
      for (let dependency of install.children) {
        data = `import { ${dependency.upperName} } from '../spm_modules/${dependency.name}/${dependency.files.script}'\n${data}`
      }
      Fs.writeFile(Path.join(install.path, CONST.INSTANCE_FOLDER, `${CONST.INSTANCE_FOLDER}.js`), data, err => {
        if (err) { return reject(err) }
        return resolve(install)
      })
    })
  })
}

/* imports all dependencies from instance file and exports the class */
let processModularDependenciesPromise = (install) => {
  if (install.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Fs.readFile(Path.join(install.path || install.pathFinal, install.files.script), 'utf8', (err, data) => {
      if (err && err.code !== 'ENOENT') { return reject(err) }
      if (install.path) {
      // case sub-dependency : exporting the class
        data = `export ${data}`
        if (install.children.length) {
          let dependencies = []
          for (let dependency of install.children) {
            dependencies.push(`${dependency.lowerName}`)
          }
          let path = Path.relative(Path.dirname(Path.join(install.path, install.files.script)), Path.join(install.path, CONST.INSTANCE_FOLDER, `${CONST.INSTANCE_FOLDER}.js`))
          data = `import { ${dependencies.join(', ')} } from '${path}'\n\n${data}`
        }
      } else {
      // case top lvl dependencies
        let path = Path.relative(Path.dirname(Path.join(install.pathFinal, install.files.script)), Path.join(install.pathFinal, CONST.INSTANCE_FOLDER))
        let regex = new RegExp(`import {.{1,}} from '${path}/spm_instances'\n`)
        let details = regex.exec(data)
        let extract
        if (details && details.index !== undefined) {
          let startIndex = data.indexOf('{', details.index)
          let endIndex = data.indexOf('}', details.index)
          extract = data.substring(startIndex + 2, endIndex - 1).split(', ')
          for (let name of install.names) {
            let lowerName = Common.firstLetterLowerCase(name)
            if (!extract.includes(lowerName)) { extract.push(lowerName) }
          }
          data = `${data.substring(0, startIndex + 2)}${extract.join(', ')}${data.substring(endIndex - 1)}`
        } else {
          extract = []
          for (let name of install.names) {
            let lowerName = Common.firstLetterLowerCase(name)
            if (!extract.includes(lowerName)) { extract.push(lowerName) }
          }
          data = `import { ${extract.join(', ')} } from '${path}/spm_instances'\n\n${data}`
        }
      }
      Fs.writeFile(Path.join(install.path || install.pathFinal, install.files.script), data, err => {
        if (err) { return reject(err) }
        if (install.debug) { console.log('>> ( js) updating', `${Path.join(install.path || install.pathFinal, install.files.script)}`) }
        return resolve(install)
      })
    })
  })
}

/* creates or updates the adequate js instance file */
let generateInstancePromise = (generate) => {
  if (generate.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Fs.mkdir(Path.join(generate.pathFinal, CONST.INSTANCE_FOLDER), err => {
      if (err && err.code !== 'EEXIST') { return reject(err) }
      Fs.readFile(Path.join(generate.pathFinal, CONST.INSTANCE_FOLDER, `${CONST.INSTANCE_FOLDER}.js`), 'utf8', (err, data) => {
        if (err && err.code !== 'ENOENT') { return reject(err) } else if (err) { data = '' }
        let path = Path.relative(Path.dirname(Path.join(generate.pathFinal, CONST.INSTANCE_FOLDER, `${CONST.INSTANCE_FOLDER}.js`)), Path.join(generate.pathFinal, 'spm_modules', generate.moduleName, generate.jsonDependency.files.script))
        if (generate.jsStandard === 'modular') {
          if (data.indexOf(`import { ${generate.upperName} } from '${path}'\n`) === -1) {
            let startIndex = -1
            let endIndex = 0
            while ((startIndex = data.indexOf('import', startIndex + 1)) >= 0) {
              if ((endIndex = data.indexOf('\'\n', startIndex)) === -1) {
                return reject(new Error('issue in instance file'))
              } else {
                endIndex += 2
              }
            }
            data = `${data.substring(0, endIndex)}import { ${generate.upperName} } from '${path}'\n${data.substring(endIndex)}`
          }
        }
        let parameters = ''
        for (let jsVar of generate.jsonDependency.js.instancesVar) {
          parameters += `${jsVar.type === 'string' ? '\'' : ''}${generate.variablesMap[jsVar.name].to || generate.variablesMap[jsVar.name].from}${jsVar.type === 'string' ? '\'' : ''},`
        }
        for (let moduleClass of generate.jsonDependency.classes) {
          if (moduleClass.js) { parameters += `'${generate.nicknames[moduleClass.name]}',` }
        }
        if (parameters.endsWith(',')) { parameters = parameters.slice(0, -1) }
        data += `${generate.assign && generate.jsStandard === 'modular' ? 'export ' : ''}${generate.assign ? 'let ' + generate.nickname + ' = ' : ''}new ${generate.upperName}(${parameters})\n`
        Fs.writeFile(Path.join(generate.pathFinal, CONST.INSTANCE_FOLDER, `${CONST.INSTANCE_FOLDER}.js`), data, err => {
          if (err) { return reject(err) }
          if (generate.jsStandard === 'modular' && generate.assign) {
            Fs.readFile(Path.join(generate.pathFinal, generate.jsonFile.files.script), 'utf8', (err, data) => {
              let tmpData = data
              if (err && err.code !== 'ENOENT') { return reject(err) } else if (err) { return resolve(generate) }
              let path = Path.relative(Path.dirname(Path.join(generate.pathFinal, generate.jsonFile.files.script)), Path.join(generate.pathFinal, CONST.INSTANCE_FOLDER))
              let regex = new RegExp(`import {.{1,}} from '${path}/spm_instances'\n`)
              let details = regex.exec(data)
              let extract
              if (details && details.index !== undefined) {
                let startIndex = data.indexOf('{', details.index)
                let endIndex = data.indexOf('}', details.index)
                extract = data.substring(startIndex + 2, endIndex - 1).split(', ')
                if (!extract.includes(generate.nickname)) { extract.push(generate.nickname) }
                data = `${data.substring(0, startIndex + 2)}${extract.join(', ')}${data.substring(endIndex - 1)}`
              } else {
                data = `import { ${generate.nickname} } from '${path}/spm_instances'\n\n${data}`
              }
              if (data !== tmpData) {
                Fs.writeFile(Path.join(generate.pathFinal, generate.jsonFile.files.script), data, err => {
                  if (err) { return reject(err) }
                  return resolve(generate)
                })
              } else { return resolve(generate) }
            })
          } else { return resolve(generate) }
        })
      })
    })
  })
}

module.exports = {
  fileCheckerPromise,
  processSubInstancesModularPromise,
  processInstancesPromise,
  splitsLegacyFilePromise,
  processModularDependenciesPromise,
  generateInstancePromise
}
