
const {
  toMS,
  getElapsedTime,
  sleep,
  createTimeoutError,
} = require('./utils')

module.exports = class RunMonitor {
  constructor (monitorConfig, monitorSetConfig, attempt) {
    Object.assign(this, {
      monitorConfig,
      monitorSetConfig,
      attempt,
    })
  }

  async exec () {
    const {
      monitorSetConfig,
      monitorConfig,
      attempt,
    } = this
    const { monitor, beforeEach, afterEach } = monitorConfig
    const start = process.hrtime()
    const timeout = toMS(monitorConfig.timeout || '5s')

    const logs = []
    function log (str) {
      logs.push(str)
    }

    try {
      const args = [monitorConfig, monitorSetConfig, {
        attempt,
        log,
      }]
      if (typeof beforeEach === 'function') {
        await beforeEach(...args)
      }
      await Promise.race([
        monitor(...args),
        sleep(timeout).then(() => {
          throw createTimeoutError(`monitor ${monitorConfig.id} timed out!`)
        }),
      ])
      if (typeof afterEach === 'function') {
        await afterEach(...args)
      }
      return {
        monitorSetConfig,
        monitorConfig,
        elapsedTime: getElapsedTime(start),
        attempt,
        logs,
        success: true,
      }
    } catch (error) {
      return {
        monitorSetConfig,
        monitorConfig,
        elapsedTime: getElapsedTime(start),
        attempt,
        logs,
        success: false,
        error,
      }
    }
  }
}
