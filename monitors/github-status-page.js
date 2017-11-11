
const request = require('request-promise')
const assert = require('assert')

async function monitor ({ parameters }) {
  assert(parameters.url)
  const response = await request(parameters.url, {
    json: true,
    resolveWithFullResponse: true,
  })

  assert.equal(response.statusCode, 200)
  const { body } = response

  assert.equal('good', body.status)
}

exports.monitors = [
  {
    id: 'github-status-page',
    parameters: {
      url: 'https://status.github.com/api/status.json',
    },
    monitor,
    slowThreshold: '100ms',
  },
]
