/* STYLEGUIDE PUBLISH : to send your styleguide to spm registry */
module.exports = (Program) => {
  return new Promise((resolve, reject) => {
    Program
    .command('publish')
    .alias('p')
    .description(`to send your styleguide to spm registry`)
    .action(() => {
      console.log('styleguide feature released soon !')
      return resolve()
    })
  })
}
