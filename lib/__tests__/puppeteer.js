
const assert = require('assert')

const runMonitor = require('..')

const getMonitorSet = (name) => {
  const config = require(`../../${name}`)
  config.id = name
  return config
}

test('runMonitor(monitors/google.js)', async () => {
  const config = getMonitorSet('monitors/google.js')
  const results = await runMonitor([config]).exec()
  assert(Array.isArray(results))
  results.forEach((result) => {
    assert(result.success)
  })
})
