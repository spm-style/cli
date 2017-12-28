let Prompt = require('inquirer').prompt

let questions = [{
  type: 'list',
  name: 'a',
  message: 'a ?',
  choices: ['a', 'b', 'c']
},
{
  type: 'checkbox',
  name: 'b',
  message: 'b ?',
  choices: ['1', '2', '3'],
  default: ['2']
}
]

module.exports = {
  test: (i) => {
    return new Promise((resolve, reject) => {
      Prompt(questions)
      .then(answers => {
        if (answers.a !== 'b') { console.log('echec a') } else { console.log('success a') }
        if (answers.b.length !== 1 || answers.b[0] !== '1') { console.log('echec b') } else { console.log('success b') }
        return resolve()
      })
      .catch(reject)
    })
  }
}
