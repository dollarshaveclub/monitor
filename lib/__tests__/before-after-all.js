
const assert = require('assert')

const runMonitor = require('..')

const getMonitorSet = (name) => {
  const config = require(`../../${name}`)
  config.id = name
  return config
}

test('runMonitor(monitors/status-pages.js)', async () => {
  let before = false
  let after = false
  let config = getMonitorSet('monitors/status-pages.js')
  config = Object.assign({}, config, {
    beforeAll (monitorSetConfig) {
      assert(monitorSetConfig)
      before = true
    },
    afterAll (monitorSetConfig, result) {
      assert(monitorSetConfig)
      assert(result.success)
      after = true
    },
  })
  await runMonitor([config]).exec()
  assert(before)
  assert(after)
})
