let Chalk = require('chalk')
let Debug = require('./debug')

/* Graphical function to print the arborescence */
let printArborescence = (action, settings) => {
  if (action.debug) { Debug(settings.results) }
  if (settings.results.length) {
    settings.maxLen += 6
    let final = ''
    let indicator = 0
    for (let line of settings.results) {
      final = `${final}\n${line.text}`
      if (line.instances && Object.keys(line.instances).length) {
        let first = true
        for (let instance in line.instances) {
          if (first) {
            let index = 0
            while (line.len + 1 < settings.maxLen) {
              index++
              final += Chalk.hex('#464646')((first && index > 2) ? '.' : ' ')
              line.len++
            }
          } else {
            if (indicator + 1 < settings.results.length && settings.results[indicator + 1].level) { final += `\n${Array(settings.results[indicator + 1].level * 3).join(' ')}${Chalk.hex('#F6EAB7')('|')}${Array(settings.maxLen - settings.results[indicator + 1].level * 3).join(' ')}` } else { final += `\n${Array(settings.maxLen).join(' ')}` }
          }
          final += `  ${Chalk.hex('#00BBFF')(instance)}`
          first = false
        }
        if (indicator + 1 < settings.results.length && settings.results[indicator + 1].level) { final += `\n${Array(settings.results[indicator + 1].level * 3).join(' ')}${Chalk.hex('#F6EAB7')('|')}` }
      }
      indicator++
    }
    final += '\n'
    action.successes.push(`${action.finalMessage}${final}`)
  }
}

/* prepares the string displaying the installation arborescence by recursively browsing in the tree */
let printArborescenceRecursive = (action, arborescence, settings, bases = [''], level = 0, res = '') => {
  let round = 1
  let tmpRes
  let result = res
  for (let key of Object.keys(arborescence)) {
    if (action.debug) { Debug(`arborescence - level:${level} name:${key} display:${arborescence[key].display}`) }
    if (arborescence[key].display.enable && !level) {
      if (!level) {
        tmpRes = `${key}@${arborescence[key].version}`
        settings.maxLen = tmpRes.length > settings.maxLen ? tmpRes.length : settings.maxLen
        settings.results.push({text: Chalk.hex('#40E0D0')(tmpRes), len: tmpRes.length})
      } else {
        let display = ''
        for (let i = 0; i < bases.length; i++) {
          display += bases[i]
        }
        tmpRes = `${display}  |_ ${key}@${arborescence[key].version}`
        settings.maxLen = tmpRes.length > settings.maxLen ? tmpRes.length : settings.maxLen
        settings.results.push({
          text: Chalk.hex('#F6EAB7')(display + '  |_ ') + Chalk.hex('#E78644')(`${key}@${arborescence[key].version}`),
          len: tmpRes.length,
          level,
          instances: arborescence[key].instances
        })
      }
      if (arborescence[key] != null) {
        let newBase = bases.slice()
        let newLevel = level + 1
        if (level) {
          round < Object.keys(arborescence).length ? newBase.push('  |') : newBase.push('   ')
        }
        printArborescenceRecursive(action, arborescence[key].dependencies, settings, newBase, newLevel, result)
      }
      round++
    }
  }
  if (!level) { printArborescence(action, settings) }
  return round
}

/* tree display launcher common to install & ls commands */
let prepareTreeDisplayPromise = (action) => {
  if (action.debug) { Debug(action.current.arborescence) }
  return new Promise((resolve, reject) => {
    try {
      if (!action.current.arborescence || !Object.keys(action.current.arborescence).length) {
        action.warnings.push(`no dependency found`)
        return resolve(action)
      }
      let arborescenceSettings = {
        maxLen: 0,
        results: [],
        level: 0
      }
      printArborescenceRecursive(action, action.current.arborescence, arborescenceSettings)
      return resolve(action)
    } catch (err) { reject(err) }
  })
}

module.exports = {
  prepareTreeDisplayPromise
}
