/* STYLEGUIDE UNPUBLISH : to remove a styleguide from spm registry */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('unpublish')
    .description(`to remove a styleguide from spm registry`)
    .action(() => {
      console.log('styleguide feature released soon !')
      return resolve()
    })
  })
}
