/* STYLEGUIDE CREATE : to create a styleguide as a spm file */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('create')
    .alias('c')
    .description(`to create a styleguide as a spm file`)
    .action(() => {
      console.log('styleguide feature released soon !')
      return resolve()
    })
  })
}
