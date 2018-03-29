/* STYLEGUIDE IMPORT : to import a styleguide from a published template */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('import')
    .alias('i')
    .description(`to import a styleguide from a published template`)
    .action(() => {
      console.log('styleguide feature released soon !')
      return resolve()
    })
  })
}
