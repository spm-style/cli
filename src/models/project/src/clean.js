/* PROJECT CLEAN : to analyze a project and reorganize spm files */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('clean')
    .description(`to analyze a project and reorganize spm files`)
    .action(() => {
      console.log('project clean delivered soon !')
      return resolve()
    })
  })
}
