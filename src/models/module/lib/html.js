const Fs = require('fs')
const Path = require('path')
const Validator = require('html-validator')
const CONST = require('../../../lib/const')
const Debug = require('../../../lib/debug')

const notClosings = ['area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr']

/* removes all comments from module's html */
let removeComments = (data) => {
  if (!data || data.length) { return data }
  let startIndex = 0
  let i, j
  while ((i = data.indexOf('<!--', startIndex)) >= 0) {
    if ((j = data.indexOf('-->', i + 4)) < 0) {
      return data
    } else {
      data = data.substring(i, j + 3)
    }
    startIndex = i
  }
  return data
}

/* changes pre whitespaces and tabulations for a clean display */
let cleanPre = (str, level = 0) => {
  if (!str || !str.length) { return str }
  let table = str.split('\n')
  if (table.length === 1) { return str }
  let res = table[0]
  let prePattern = table[table.length - 1].substring(0, table[table.length - 1].indexOf('<'))
  for (let i = 1; i < table.length; i++) { res += `\n${table[i].substring(prePattern.length)}` }
  return res
}

/* transforms the tag string content to a DOM object */
let tagToInstruction = (filePath, completeStr, tag, str, content = []) => {
  let result = {
    tag,
    attributes: {},
    classes: {},
    value: null,
    content,
    str: cleanPre(completeStr),
    file: filePath
  }
  let table = str.split('="')
  for (let i = 0; i < table.length - 1; i++) {
    let property = table[i].split(' ')[table[i].split(' ').length - 1]
    if (property === 'class') {
      for (let key of table[i + 1].split('"')[0].split(' ')) {
        if (key.length) {
          result.classes[key] = true
        }
      }
    }
  }
  return result
}

/* generates a custom dom object from html DOM string */
let domToInstructions = (filePath, dom, index = 0) => {
  // remove all comments + attention si des chevrons se trouvent dans la string + case insensitive
  if (index === 100) { return [] }
  if (!dom || !dom.length || dom.startsWith('</')) { return [] }
  if (!dom.startsWith('<')) {
    let next = dom.indexOf('<')
    if (next === -1) {
      if (/^([ \t\n])*$/.test(dom)) { return [] }
      return [{
        tag: 'string',
        attributes: {},
        classes: {},
        value: dom,
        content: [],
        str: cleanPre(dom)
      }]
    } else {
      if (/^([ \t\n])*$/.test(dom.substring(0, next))) { return domToInstructions(filePath, dom.substring(next), index) }
      return [{
        tag: 'string',
        attributes: {},
        classes: {},
        value: dom.substring(0, next),
        content: [],
        str: cleanPre(dom.substring(0, next))
      }].concat(domToInstructions(filePath, dom.substring(next), index))
    }
  }
  let count = 0
  let closingChevron = dom.indexOf('>')
  let tag = dom.substring(1, Math.min(closingChevron, dom.indexOf(' ')))
  let i, j
  if (notClosings.includes(tag)) {
    let next = dom.indexOf('>')
    return [tagToInstruction(filePath, next === -1 ? dom : dom.substring(0, next + 1), tag, dom.substring(1, closingChevron))].concat(next === -1 ? [] : domToInstructions(filePath, dom.substring(next + 1), index))
  } else {
    let startIndex = 1
    count++
    while (count !== 0 && startIndex !== -1) {
      let i1 = dom.indexOf(`<${tag}>`, startIndex)
      let i2 = dom.indexOf(`<${tag} `, startIndex)
      if (i1 < i2 && i1 !== -1) { i = i1 } else { i = i2 }
      j = dom.indexOf(`</${tag}>`, startIndex)
      if (i < j && i >= 0) {
        count++
        startIndex = i + 1
      } else if (i === -1 || (i >= 0 && j >= 0)) {
        count--
        startIndex = j + 1
      } else {
        startIndex = -1
      }
    }
    if (startIndex === -1) { return [] }
  }
  if (j + `</${tag}>`.length === dom.length) {
    return [tagToInstruction(filePath, dom, tag, dom.substring(1, closingChevron), domToInstructions(filePath, dom.substring(closingChevron + 1, j), index + 1))]
  } else {
    return [tagToInstruction(filePath, dom.substring(0, j + `</${tag}>`.length), tag, dom.substring(1, closingChevron), domToInstructions(filePath, dom.substring(closingChevron + 1, j), index + 1))].concat(domToInstructions(filePath, dom.substring(j + `</${tag}>`.length), index))
  }
}

/* checks in one root element if any-level child matches mainClass */
let htmlSelecterPromise = (domObject, mainClass, all) => {
  return new Promise((resolve, reject) => {
    if (domObject.classes[mainClass]) { return resolve([domObject]) } else {
      let promises = []
      for (let item of domObject.content) { promises.push(htmlSelecterPromise(item, mainClass, all)) }
      Promise.all(promises)
      .then(results => {
        let finalResult = []
        for (let result of results) {
          if (result.length) {
            if (result[0].tag && !all) { return resolve(result) } else if (result[0].tag) { finalResult = finalResult.concat(result) }
          }
        }
        return resolve(finalResult)
      })
      .catch(reject)
    }
  })
}

/* checks html for dom included inside mainClass element */
let htmlSelectersPromise = (domArray, mainClass, all) => {
  return new Promise((resolve, reject) => {
    let topPromises = []
    if (!domArray.length) { return resolve([]) }
    for (let domObject of domArray) { topPromises.push(htmlSelecterPromise(domObject, mainClass, all)) }
    Promise.all(topPromises)
    .then(results => {
      let finalResult = []
      for (let result of results) {
        if (result.length) {
          if (!all) { return resolve(result) }
          finalResult = finalResult.concat(result)
        }
      }
      return resolve(finalResult)
    })
    .catch(reject)
  })
}

/* checks first level and complete classes for dependencies */
let processDomClasses = (dom, obj = { firstLevelClasses: [], allClasses: [] }, topLevel = true) => {
  for (let subDom of dom) {
    for (let domClass in subDom.classes) {
      if (topLevel && !obj.firstLevelClasses.includes(domClass)) { obj.firstLevelClasses.push(domClass) }
      if (!obj.allClasses.includes(domClass)) { obj.allClasses.push(domClass) }
    }
    processDomClasses(subDom.content, obj, false)
  }
  return obj
}

/* checks if html is correct and returns a full dom-tree with classes */
let htmlProcesserPromise = (item, filePath, dom, mainClass, validation, all = false) => {
  return new Promise((resolve, reject) => {
    let options = {
      format: 'text',
      data: dom,
      ignore: [
        'Error: Start tag seen without seeing a doctype first. Expected “<!DOCTYPE html>”.',
        'Error: Element “head” is missing a required instance of child element “title”.'
      ]
    }
    Validator(options, (err, data) => {
      if (err) { return reject(err) }
      if (data.endsWith('There were errors.') && validation) {
        return reject(data.slice(0, -19))
      } else {
        let completeDom = domToInstructions(filePath, dom)
        let classesDetail = processDomClasses(completeDom)
        if (!classesDetail.firstLevelClasses.length) { return reject(new Error(`dom must be wrapped in an element using module's main class ${mainClass}`)) }
        if (!classesDetail.firstLevelClasses.includes(mainClass)) { return reject(new Error(`spm module must be wrapped in main class ${mainClass}`)) }
        let undeclaredClasses = []
        for (let firstLevelClass of classesDetail.firstLevelClasses) {
          if (!item.json.classes.concat(item.json.mainClass).includes(firstLevelClass) && !undeclaredClasses.includes(firstLevelClass)) { undeclaredClasses.push(firstLevelClass) }
        }
        if (undeclaredClasses.length) { return reject(new Error(`undeclared classes ${undeclaredClasses.join(', ')} in html file\n=> use spm module edit --classes='${undeclaredClasses.join(',')}'`)) }
        for (let singleClass of classesDetail.allClasses) {
          if (singleClass.includes('_') && !Object.keys(item.json.dependencies).includes(singleClass)) {
            return reject(new Error(`found class ${singleClass} in module - cannot use underscore in class name - remove or declare as spm dependency`))
          }
        }
        htmlSelectersPromise(completeDom, mainClass, all)
        .then(result => {
          if (!result.length) { return reject(new Error('main class not found')) }
          return resolve(result)
        })
        .catch(reject)
      }
    })
  })
}

/* finds all html patterns with mainClass */
let patternFinderPromise = (item, projectPath, mainClass) => {
  return new Promise((resolve, reject) => {
    Fs.lstat(projectPath, (err, stats) => {
      if (err) { return reject(err) }
      if (stats.isDirectory()) {
        Fs.readdir(projectPath, (err, files) => {
          if (err) { return reject(err) }
          let promises = []
          for (let file of files) {
            promises.push(patternFinderPromise(item, `${projectPath}/${file}`, mainClass))
          }
          Promise.all(promises)
          .then(results => {
            let finalResult = []
            for (let result of results) { if (result.length) { finalResult = finalResult.concat(result) } }
            return resolve(finalResult)
          })
          .catch(reject)
        })
      } else if (projectPath.endsWith('.html')) {
        validatorPromise(item, projectPath, mainClass, false, true)
        .then(resolve)
        .catch(reject)
      } else { return resolve([]) }
    })
  })
}

/* creates a file with a list of html excerpts found + origin files */
let conflictSolverPromise = (item, projectPath, mainClass) => {
  return new Promise((resolve, reject) => {
    patternFinderPromise(item, projectPath, mainClass)
    .then(resolve)
    .catch(reject)
  })
}

/* validates the ref-dom.html */
let validatorPromise = (item, filePath, mainClass, validation = true, all = false) => {
  return new Promise((resolve, reject) => {
    Fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) { return reject(err) }
      data = removeComments(data)
      if (validation && !data.length) {
        return reject(new Error(`empty html content found in ${filePath} - put module DOM in it or delete to let spm run conflict checker`))
      } else if (!data.length) {
        return resolve([])
      } else {
        htmlProcesserPromise(item, filePath, data, mainClass, validation, all)
        .then(resolve)
        .catch(err => {
          return reject(new Error(`in file ${filePath}:\n${err}`))
        })
      }
    })
  })
}

/* html checker */
let fileCheckerPromise = (publish) => {
  if (publish.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Fs.access(`${publish.path}/${publish.json.files.index}`, Fs.constants.F_OK, (err) => {
      if (err && !publish.projectPath) {
        return reject(new Error(`reference html file not found in your module`))
      } else if (err || publish.htmlChecker) {
        conflictSolverPromise(publish, `${publish.projectPath}`, publish.json.mainClass)
        .then(patternList => {
          if (!patternList.length) { return reject(new Error(`main class not found in your project`)) }
          let data = ''
          let alreadyAdded = []
          for (let pattern of patternList) {
            if (!alreadyAdded.includes(pattern.str)) {
              data += `<!--============= pattern found in ${pattern.file}-->\n${pattern.str}\n<!--============= end of pattern-->\n\n`
              alreadyAdded.push(pattern.str)
            }
          }
          Fs.writeFile(`${publish.path}/${publish.json.files.index}`, data, err => {
            if (err) { return reject(err) }
            return reject(new Error(`conflicts identified in your file - please validate ${publish.json.files.index} and publish again`))
          })
        })
        .catch(reject)
      } else {
        validatorPromise(publish, `${publish.path}/${publish.json.files.index}`, publish.json.mainClass)
        .then(pattern => {
          publish.dom = pattern[0].str
          return resolve(publish)
        })
        .catch(reject)
      }
    })
  })
}

/* updates the html files with instance file and dependencies in legacy */
let processInstancesPromise = (install) => {
  if (install.debug) { Debug() }
  return new Promise((resolve, reject) => {
    Fs.readFile(`${install.pathFinal}/${install.files.index}`, 'utf8', (err, data) => {
      if (err && err.code !== 'ENOENT') { return reject(err) } else if (err) { return resolve(install) }
      // <script type="module"> not operational so far with some browsers so not included in code
      let index, start, previous, previousEnd
      if ((index = data.indexOf('</body>')) === -1) { return resolve(install) }
      let path = Path.relative(Path.dirname(`${install.pathFinal}/${install.files.index}`), `${install.pathFinal}/${CONST.INSTANCE_FOLDER}/${CONST.INSTANCE_FOLDER}.js`)
      let jsScriptType = install.jsStandard === 'modular' ? 'type="module" ' : ''
      if (data.indexOf(`<script ${jsScriptType}src="${path}"></script>\n`) !== -1) { // ${data.substring(previous + 1, previousEnd)}
        index = data.indexOf(`<script ${jsScriptType}src="${path}"></script>\n`)
        previous = index - 1
        previousEnd = index
        while (previous !== -1 && data[previous] !== '\n') { previous-- }
        start = previous
      } else {
        start = index
        while (start !== -1 && data[start] !== '\n') { start-- }
        if (start === -1) { return resolve(install) }
        previous = start - 1
        while (previous !== -1 && data[previous] !== '\n') { previous-- }
        previousEnd = previous + 1
        while ([' ', '\t'].includes(data[previousEnd])) { previousEnd++ }
        data = `${data.substring(0, start + 1)}${data.substring(previous + 1, previousEnd)}<script ${jsScriptType}src="${path}"></script>\n${data.substring(start + 1)}`
      }
      let addedContent = ''
      for (let dependency of install.children) {
        if (dependency.added) {
          path = Path.relative(Path.dirname(`${install.pathFinal}/${install.files.index}`), `${dependency.path}/${dependency.files.script}`)
          if (data.indexOf(`${data.substring(previous + 1, previousEnd)}<script ${jsScriptType}src="${path}"></script>\n`) === -1) {
            addedContent += `${data.substring(previous + 1, previousEnd)}<script ${jsScriptType}src="${path}"></script>\n`
          }
        }
      }
      data = `${data.substring(0, start + 1)}${addedContent}${data.substring(start + 1)}`
      Fs.writeFile(`${install.pathFinal}/${install.files.index}`, data, err => {
        if (err) { return reject(err) }
        return resolve(install)
      })
    })
    return resolve(install)
  })
}

/* creates or updates the adequate html file */
let generateInstancePromise = (generate) => {
  return new Promise((resolve, reject) => {
    Fs.readFile(`${generate.pathFinal}/${generate.jsonFile.files.index}`, 'utf8', (err, data) => {
      if (err && err.code !== 'ENOENT') { return reject(err) } else if (err) { return resolve(generate) }
      let index, start, previous, previousEnd
      if ((index = data.indexOf('</body>')) === -1) { return resolve(generate) }
      let path = Path.relative(Path.dirname(`${generate.pathFinal}/${generate.jsonFile.files.index}`), `${generate.pathFinal}/${CONST.INSTANCE_FOLDER}/${CONST.INSTANCE_FOLDER}.js`)
      let jsScriptType = generate.jsStandard === 'modular' ? 'type="module" ' : ''
      if (data.indexOf(`<script ${jsScriptType}src="${path}"></script>\n`) !== -1) {
        start = index
        while (start !== -1 && data[start] !== '\n') { start-- }
        if (start === -1) { return resolve(generate) }
        previous = start - 1
        while (previous !== -1 && data[previous] !== '\n') { previous-- }
        previousEnd = previous + 1
        while ([' ', '\t'].includes(data[previousEnd])) { previousEnd++ }
        data = `${data.substring(0, start + 1)}${data.substring(previous + 1, previousEnd)}<script ${jsScriptType}src="${path}"></script>\n${data.substring(start + 1)}`
        Fs.writeFile(`${generate.pathFinal}/${generate.jsonFile.files.index}`, data, err => {
          if (err) { return reject(err) }
          return resolve(generate)
        })
      } else { return resolve(generate) }
    })
  })
}

module.exports = {
  fileCheckerPromise,
  processInstancesPromise,
  generateInstancePromise
}
