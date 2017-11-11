
const assert = require('assert')

const runMonitor = require('..')

const getMonitorSet = (name) => {
  const config = require(`../../${name}`)
  config.id = name
  return config
}

test('runMonitor(monitors/status-pages.js)', async () => {
  const config = getMonitorSet('monitors/status-pages.js')
  const results = await runMonitor([config]).exec()
  assert(Array.isArray(results))
  results.forEach((result) => {
    assert(result.success)
  })
})

test('runMonitor(monitors/status-pages.js) w/ concurrency', async () => {
  const config = getMonitorSet('monitors/status-pages.js')
  const results = await runMonitor([config], {
    concurrency: 2,
  }).exec()
  assert(Array.isArray(results))
  results.forEach((result) => {
    assert(result.success)
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
