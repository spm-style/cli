let jsons = [
  {
    name: 'tata',
    version: '1.8.8',
    style: 'scss',
    main: 'index.scss',
    scripts: {
      test: 'echo "Error = no test specified" && exit 1'
    },
    author: 'hervessssss',
    licence: 'IST',
    keywords: [
      ''
    ],
    description: 'fucking good testing'
  },
  {
    name: 'toto',
    version: '2.8.8',
    style: 'scss',
    main: 'index.scss',
    scripts: {
      test: 'echo "Error = no test specified" && exit 1'
    },
    author: 'hervessssss',
    licence: 'IST',
    keywords: [
      ''
    ],
    description: 'fucking good testing'
  },
  {
    name: 'titi',
    version: '4.5.4',
    style: 'scss',
    main: 'index.scss',
    scripts: {
      test: 'echo "Error = no test specified" && exit 1'
    },
    author: 'hervessssss',
    licence: 'IST',
    keywords: [
      ''
    ],
    description: 'fucking good testing',
    dependencies: {
      tata: '1.8.8'
    }
  },
  {
    name: 'tutu',
    version: '1.2.8',
    style: 'scss',
    main: 'index.scss',
    scripts: {
      test: 'echo "Error = no test specified" && exit 1'
    },
    author: 'hervessssss',
    licence: 'IST',
    keywords: [
      ''
    ],
    description: 'fucking good testing',
    dependencies: {
      titi: '4.5.4'
    }
  },
  {
    name: 'truc',
    version: '2.3.2',
    style: 'scss',
    main: 'index.scss',
    scripts: {
      test: 'echo "Error = no test specified" && exit 1'
    },
    author: 'hervessssss',
    licence: 'IST',
    keywords: [
      ''
    ],
    description: 'fucking good testing',
    dependencies: {
      tutu: '1.2.8'
    }
  },
  {
    name: 'machin',
    version: '7.9.1',
    style: 'scss',
    main: 'index.scss',
    scripts: {
      test: 'echo "Error = no test specified" && exit 1'
    },
    author: 'hervessssss',
    licence: 'IST',
    keywords: [
      ''
    ],
    description: 'fucking good testing',
    dependencies: {
      trucMuch: '0.0.1'
    }
  },
  {
    name: 'trucMuch',
    version: '0.0.1',
    style: 'scss',
    main: 'index.scss',
    scripts: {
      test: 'echo "Error = no test specified" && exit 1'
    },
    author: 'hervessssss',
    licence: 'IST',
    keywords: [
      ''
    ],
    description: 'fucking good testing'
  },
  {
    name: 'bidul',
    version: '1.8.8',
    style: 'scss',
    main: 'index.scss',
    scripts: {
      test: 'echo "Error = no test specified" && exit 1'
    },
    author: 'hervessssss',
    licence: 'IST',
    keywords: [
      ''
    ],
    description: 'fucking good testing',
    dependencies: {
      truc: '2.3.2',
      machin: '7.9.1',
      trucMuch: '0.0.1',
      bgdh: '0.0.1'
    }
  },
  {
    name: 'select',
    version: '1.0.0',
    style: 'scss',
    main: 'index.scss',
    scripts: {
      test: 'echo "Error = no test specified" && exit 1'
    },
    author: 'hervessssss',
    licence: 'IST',
    keywords: [
      ''
    ],
    description: 'fucking good testing',
    dependencies: {
      input: '1.0.0'
    }
  },
  {
    name: 'input',
    version: '1.0.0',
    style: 'scss',
    main: 'index.scss',
    scripts: {
      test: 'echo "Error = no test specified" && exit 1'
    },
    author: 'hervessssss',
    licence: 'IST',
    keywords: [
      ''
    ],
    description: 'fucking good testing',
    dependencies: {
      'input-core': '0.0.1'
    }
  },
  {
    name: 'input-core',
    version: '0.0.1',
    style: 'scss',
    main: 'index.scss',
    scripts: {
      test: 'echo "Error = no test specified" && exit 1'
    },
    author: 'hervessssss',
    licence: 'IST',
    keywords: [
      ''
    ],
    description: 'fucking good testing'
  },
  {
    name: 'test1',
    version: '4.0.1',
    style: 'scss',
    main: 'index.scss',
    scripts: {
      test: 'echo "Error = no test specified" && exit 1'
    },
    author: 'adriennnnn',
    licence: 'IST',
    keywords: [
      ''
    ],
    description: 'fucking good testing'
  }
]

let latest = {
  bidul: '1.8.8',
  trucMuch: '0.0.1',
  machin: '7.9.1',
  truc: '2.3.2',
  tutu: '1.2.8',
  titi: '4.5.4',
  toto: '2.8.8',
  tata: '1.8.8',
  input: '1.0.0',
  select: '1.0.0',
  test1: '4.0.1',
  'input-core': '0.0.1'
}

module.exports = {
  jsons,
  latest
}
