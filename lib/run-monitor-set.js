
const shuffle = require('lodash/shuffle')
const chalk = require('chalk')

const RunMonitor = require('./run-monitor')
const {
  toMS,
  getElapsedTime,
  logElapsedTime,
} = require('./utils')

module.exports = class RunMonitorSet {
  constructor (runner, monitorSetConfig) {
    this.runner = runner
    this.monitorSetConfig = monitorSetConfig

    this._shuffle = runner.options.shuffleMonitors
    this._stream = runner.options.concurrency === 1
  }

  async exec () {
    const stream = !!this._stream
    if (stream) console.log(this.logMonitorSetStart())
    const result = await this._runMonitorSet()
    if (stream) console.log(this.logMonitorSetEnd(result) + '\n')
    else {
      const logs = [this.logMonitorSetResult(result)]
        .concat(result.results.map(x =>
          x.results.map((result) => [
            this.logCustomMonitorLogs(result.logs),
            this.logMonitorResult(result),
          ].filter(Boolean).join('\n'))
        ).reduce((a, b) => a.concat(b), []))
      console.log(logs.join('\n') + '\n')
    }

    return result
  }

  async _runMonitorSet () {
    const start = process.hrtime()

    const {
      monitorSetConfig,
      runner: {
        events,
      },
    } = this
    let { monitors } = monitorSetConfig
    if (this._shuffle) monitors = shuffle(monitors)

    if (monitorSetConfig.beforeAll) await monitorSetConfig.beforeAll(monitorSetConfig)

    const results = []
    for (const monitorConfig of monitors) {
      events.emit('monitor:start', monitorConfig, monitorSetConfig)
      const result = await this.runMonitor(monitorConfig)
      results.push(result)
      events.emit('monitor', result)
    }

    const output = {
      monitorSetConfig,
      results,
      success: results.every(result => result.success),
      elapsedTime: getElapsedTime(start),
    }

    if (monitorSetConfig.afterAll) await monitorSetConfig.afterAll(monitorSetConfig, output)

    return output
  }

  // runs the monitor with retries with each retry being in .results
  async runMonitor (monitorConfig) {
    const start = process.hrtime()
    const {
      monitorSetConfig,
      runner: {
        events,
      },
    } = this
    const retries = ~~monitorConfig.retries
    let attempt = 0
    const results = []
    while (attempt++ <= retries && !results.some(x => x.success)) {
      events.emit('monitor:attempt:start', monitorConfig, monitorSetConfig)
      const result = await new RunMonitor(monitorConfig, monitorSetConfig, attempt).exec()
      // NOTE: logs each try, not the final result of the monitor
      if (this._stream) {
        if (result.logs.length) console.log(this.logCustomMonitorLogs(result.logs))
        console.log(this.logMonitorResult(result))
      }
      results.push(result)
      events.emit('monitor:attempt', result)
    }

    return {
      monitorSetConfig,
      monitorConfig,
      elapsedTime: getElapsedTime(start),
      success: results.some(x => x.success),
      results,
    }
  }

  logResultAsFraction (results) {
    const successes = results.filter(x => x.success).length
    const total = results.length
    return chalk.bold(`${successes}/${total}`)
  }

  logMonitorSetStart () {
    return `${chalk.underline(this.monitorSetConfig.id)}:`
  }

  logMonitorSetEnd ({ monitorSetConfig, elapsedTime, success, results }) {
    const slow = toMS(monitorSetConfig.slowThreshold, '30s')
    const time = chalk[elapsedTime > slow ? 'yellow' : 'green'](`(${logElapsedTime(elapsedTime)})`)
    if (success) return `  ${chalk.green('✔')} ${this.logResultAsFraction(results)} ${time}`
    return `  ${chalk.red('✕')} ${this.logResultAsFraction(results)} ${time}`
  }

  logMonitorSetResult ({ monitorSetConfig, elapsedTime, success, results }) {
    const slow = toMS(monitorSetConfig.slowThreshold, '30s')
    const time = chalk[elapsedTime > slow ? 'yellow' : 'green'](`(${logElapsedTime(elapsedTime)})`)
    if (success) return `${chalk.green('✔')} ${chalk.underline(monitorSetConfig.id)} ${this.logResultAsFraction(results)} ${time}:`
    return `${chalk.red('✕')} ${chalk.underline(monitorSetConfig.id)} ${this.logResultAsFraction(results)} ${time}:`
  }

  logMonitorResult ({ monitorConfig, elapsedTime, success, error }, i) {
    const slow = toMS(monitorConfig.slowThreshold, '1s')
    const time = chalk[elapsedTime > slow ? 'yellow' : 'green'](`(${logElapsedTime(elapsedTime)})`)
    if (success) return `    ${chalk.green('✔')} ${monitorConfig.id} ${time}`

    return [
      '      ' + chalk.red(error.stack).replace(/\n/g, '\n      '),
      `    ${chalk.red('✕')} ${monitorConfig.id} ${time}`,
    ].join('\n')
  }

  logCustomMonitorLogs (logs) {
    return logs.map(x => '      ' + x.replace(/\n/g, '\n      ')).join('\n')
  }
}
