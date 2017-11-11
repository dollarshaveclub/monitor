
const assert = require('assert')

const runMonitor = require('..')

const getMonitorSet = (name) => {
  const config = require(`../../${name}`)
  config.id = name
  return config
}

test('runMonitor(monitors-failing/failing.js)', async () => {
  const config = getMonitorSet('monitors-failing/failing.js')
  const results = await runMonitor([config]).exec()
  assert(Array.isArray(results))
  results.forEach((result) => {
    assert(!result.success)
    result.results.some(x => x.success)
    result.results.some(x => !x.success)
  })
})

test('runMonitor(monitors-failing/failing.js)', async () => {
  const config = getMonitorSet('monitors-failing/duplicates.js')
  try {
    await runMonitor([config]).exec()
    throw new Error('boom')
  } catch (err) {
    console.error(err.stack)
    assert(/duplicate/i.test(err.message))
  }
})
