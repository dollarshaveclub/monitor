
const request = require('request-promise')
const assert = require('assert')

exports.monitors = [
  {
    id: 'github-status',
    parameters: {
      url: 'https://status.github.com/api/status.json',
    },
    slowThreshold: '100ms',
    async monitor ({ parameters }) {
      assert(parameters.url)
      const response = await request(parameters.url, {
        json: true,
        resolveWithFullResponse: true,
      })

      assert.equal(response.statusCode, 200)
      const { body } = response

      assert.equal('good', body.status)
    },
  },

  {
    id: 'saucelabs-status',
    parameters: {
      url: 'https://status.saucelabs.com/api/v2/status.json',
    },
    slowThreshold: '100ms',
    async monitor ({ parameters }) {
      assert(parameters.url)
      const response = await request(parameters.url, {
        json: true,
        resolveWithFullResponse: true,
      })

      assert.equal(response.statusCode, 200)
      const { body } = response

      assert.equal('All Systems Operational', body.status.description)
    },
  },
]
