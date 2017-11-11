
const assert = require('assert')

const runMonitor = require('..')

const getMonitorSet = (name) => {
  const config = require(`../../${name}`)
  config.id = name
  return config
}

test('runMonitor(monitors/github-status-page.js)', async () => {
  const config = getMonitorSet('monitors/github-status-page.js')
  const results = await runMonitor([config]).exec()
  assert(Array.isArray(results))
  results.forEach((result) => {
    assert(result.success)
  })
})

test('runMonitor(monitors/failing.js)', async () => {
  const config = getMonitorSet('monitors/failing.js')
  const results = await runMonitor([config]).exec()
  assert(Array.isArray(results))
  results.forEach((result) => {
    assert(!result.success)
    result.results.some(x => x.success)
    result.results.some(x => !x.success)
  })
})

test('runMonitor(monitors/retries.js)', async () => {
  const config = getMonitorSet('monitors/retries.js')
  const results = await runMonitor([config]).exec()
  assert(Array.isArray(results))
  results.forEach((result) => {
    assert(result.success)

    result.results.some((monitorResult) => {
      assert(monitorResult.success)

      assert.equal(3, monitorResult.results.length)
      assert(!monitorResult.results[0].success)
      assert(!monitorResult.results[1].success)
      assert(monitorResult.results[2].success)
    })
  })
})

test('runMonitor(monitors/timeout.js) w/ shuffling', async () => {
  const config = getMonitorSet('monitors/timeout.js')
  const results = await runMonitor([config], {
    shuffleMonitors: true,
    shuffleMonitorSets: true,
  }).exec()
  assert(Array.isArray(results))
  results.forEach((result) => {
    assert(result.success)

    result.results.some((monitorResult) => {
      assert(monitorResult.success)

      assert.equal(3, monitorResult.results.length)
      assert(!monitorResult.results[0].success)
      assert(!monitorResult.results[1].success)
      assert(monitorResult.results[2].success)
    })
  })
})
