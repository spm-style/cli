let Request = require('request')

const requestsToIntercept = {
  'api.spm-style.com': {
    '/user': {
      // REGISTER
      PUT: {
        token: 'testToken',
        user: {
          login: 'testTravis',
          email: 'test@travis.com'
        }
      },
      // LOGIN
      POST: {
        token: 'testToken',
        user: {
          login: 'testTravis',
          email: 'test@travis.com'
        }
      }
    },
    '/module': {
      PUT: {
        name: 'testTravis_testModule',
        version: '1.0.0'
      }
    },
    '/package/install/testTravis_testModule': {
      GET: {
        version: '1.0.0'
      }
    }
  },
  'validator.w3.org': {
    '/nu/?out=text': {
      'POST': {
        msg: 'okokok'
      }
    }
  }
}

let startInterceptor = () => {
  let Mitm = require('mitm')()
  Mitm.on('request', (req, res) => {
    if (requestsToIntercept[req.headers.host]) {
      let msg = requestsToIntercept[req.headers.host][req.url] && requestsToIntercept[req.headers.host][req.url][req.method]
      ? requestsToIntercept[req.headers.host][req.url][req.method] : { msg: 'KO', statusCode: 402 }
      res.end(JSON.stringify(msg))
    } else {
      Mitm.disable()
      console.log(req.headers.host, req.url, req.method, req.headers)
      if (!req.headers.host.startsWith('http://')) { req.headers.host = 'http://' + req.headers.host }
      Request[req.method.toLowerCase()]({
        url: req.headers.host + req.url.substring(0, req.url.indexOf('?')),
        qs: {
          out: 'json'
        },
        headers: { 'content-type': req.headers['content-type'], 'user-agent': req.headers['user-agent'] },
        formData: { content: '<h2>B</h2>', out: 'json' }
      }, (err, res, body) => {
        if (err) { console.log(err) }
        console.log('body', JSON.parse(body))
        Mitm = require('mitm')()
      })
    }
  })
  return Mitm
}

let stopInterceptor = (Mitm) => {
  Mitm.disable()
}

module.exports = {
  startInterceptor,
  stopInterceptor
}
