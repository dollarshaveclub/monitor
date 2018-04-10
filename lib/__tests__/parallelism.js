
const assert = require('assert')

const runMonitor = require('..')

const getMonitorSet = (name) => {
  const config = require(`../../${name}`)
  config.id = name
  return config
}

jest.setTimeout(60000)

test('runMonitor(monitors/google-with-parallelism.js)', async () => {
  const config = getMonitorSet('monitors/google-with-parallelism.js')
  const results = await runMonitor([config], {
    concurrency: 2,
  }).exec()
  assert(Array.isArray(results))
  results.forEach((result) => {
    assert(result.success)
  })
})
