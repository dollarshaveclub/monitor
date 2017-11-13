
const assert = require('assert')

const runMonitor = require('..')

const getMonitorSet = (name) => {
  const config = require(`../../${name}`)
  config.id = name
  return config
}

test('runMonitor(monitors/retries.js)', async () => {
  const config = getMonitorSet('monitors/retries.js')
  const runner = runMonitor([config])
  const results = {
    monitorSets: [],
    monitors: [],
    monitorAttempts: [],
  }
  runner.events.on('monitor-set', (result) => {
    results.monitorSets.push(result)
    assert(result.success)
  })
  runner.events.on('monitor', (result) => {
    results.monitors.push(result)
    assert(result.success)
  })
  runner.events.on('monitor:attempt', (result) => {
    results.monitorAttempts.push(result)
    assert.equal('boolean', typeof result.success)
  })
  await runner.exec()

  assert.equal(1, results.monitorSets.length)
  assert.equal(1, results.monitors.length)
  assert.equal(3, results.monitorAttempts.length)
})
