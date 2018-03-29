let Common = require('../../src/lib/common')
let Fs = require('fs')

let cleanWorkspacePromise = (path) => {
  return new Promise((resolve, reject) => {
    Common.deleteFolderRecursivePromise(path, true)
    .then(resolve)
    .catch(reject)
  })
}

let prepareWorkspacePromise = (basePath, targetPath) => {
  return new Promise((resolve, reject) => {
    cleanWorkspacePromise(`${basePath}/${targetPath}`)
    .then(() => {
      Fs.mkdir(`${basePath}/${targetPath}`, err => {
        if (err && err.code !== 'EEXIST') { return reject(err) }
        process.chdir(`${basePath}/${targetPath}`)
        return resolve(basePath)
      })
    })
    .catch(reject)
  })
}

module.exports = {
  prepareWorkspacePromise,
  cleanWorkspacePromise
}
