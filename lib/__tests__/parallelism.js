
const assert = require('assert')

const runMonitor = require('..')

const getMonitorSet = (name) => {
  const config = require(`../../${name}`)
  config.id = name
  return config
}

test('runMonitor(monitors/google-with-parallelism.js)', async () => {
  const config = getMonitorSet('monitors/google-with-parallelism.js')
  const results = await runMonitor([config], {
    concurrency: 4,
  }).exec()
  assert(Array.isArray(results))
  results.forEach((result) => {
    assert(result.success)
  })
})
