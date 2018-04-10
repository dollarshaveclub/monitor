
const debug = require('debug')('dsc-monitor:lib')
const shuffle = require('lodash/shuffle')
const EventEmitter = require('events')
const assert = require('assert')
const chalk = require('chalk')
const pAll = require('p-all')

const RunMonitorSet = require('./run-monitor-set')
const config = require('./config')
const {
  getDuplicates,
  getElapsedTime,
  logElapsedTime,
  add,
} = require('./utils')

class RunAllMonitorSets {
  constructor (monitorSetConfigs, _options = {}) {
    this.monitorSetConfigs = monitorSetConfigs
      .filter(x => !x.disabled)
      .filter(x => Array.isArray(x.monitors) && x.monitors.length)

    debug(this.monitorSetConfigs)

    this.validate(this.monitorSetConfigs)

    const options = this.options = Object.assign({}, config, _options)
    debug(options)

    this.events = new EventEmitter()
  }

  async exec () {
    const start = process.hrtime()
    const { concurrency } = this.options
    const monitorSetConfigs = this.setupMonitorSets()

    if (concurrency > 1) {
      console.log('Running the following monitor sets:')
      monitorSetConfigs.forEach(({ id }) => {
        console.log('  - %s', id)
      })
      console.log('')
    }

    const jobs = monitorSetConfigs.map(x => async () => {
      this.events.emit('monitor-set:start', x)
      const result = await new RunMonitorSet(this, x).exec()
      this.events.emit('monitor-set', result)
      return result
    })

    return pAll(jobs, {
      concurrency,
    }).then((result) => {
      this.logSummary(result, {
        elapsedTime: getElapsedTime(start),
      })
      return result
    })
  }

  setupMonitorSets () {
    let { monitorSetConfigs } = this
    if (this.options.shuffleMonitorSets) monitorSetConfigs = shuffle(monitorSetConfigs)
    return monitorSetConfigs.map((monitorSetConfig) => {
      const parallelism = ~~Math.max(~~monitorSetConfig.parallelism, 1)
      if (parallelism < 2) return [monitorSetConfig]

      let { monitors } = monitorSetConfig
      if (this.options.shuffleMonitors) monitors = shuffle(monitors)
      return new Array(parallelism).fill(0).map((NULL, i) => {
        return Object.assign({}, monitorSetConfig, {
          monitors: monitors.filter((NULL, j) => j % parallelism === i),
          id: `${monitorSetConfig.id} (${i + 1}/${parallelism})`,
        })
      })
    }).reduce((a, b) => a.concat(b), [])
  }

  validate (monitorSetConfigs) {
    monitorSetConfigs.forEach((x) => {
      assert(x.id, 'Every monitor set needs an .id')
      assert(Array.isArray(x.monitors), `Monitor "${x.id}" does not have any monitors!`)
    })
    const duplicateMonitorSetIds = getDuplicates(monitorSetConfigs.map(x => x.id))
    assert(!duplicateMonitorSetIds.length, `Duplicate monitor set ids found: ${duplicateMonitorSetIds.join(', ')}`)

    monitorSetConfigs.forEach((monitorSetConfig) => {
      const { monitors } = monitorSetConfig
      monitors.forEach(x => assert(x.id, 'Every monitor needs an .id'))
      const duplicateMonitorIds = getDuplicates(monitors.map(x => x.id))
      assert(!duplicateMonitorIds.length, `Duplicate monitor ids found: ${duplicateMonitorIds.join(', ')}`)
    })
  }

  logSummary (results, {
    elapsedTime,
  }) {
    const counts = {
      monitorSets: results.length,
      successfulMonitorSets: results.filter(x => x.success).length,
      failingMonitorSets: results.filter(x => !x.success).length,

      monitors: results.map(x => x.results.length).reduce(add, 0),
      successfulMonitors: results.map(x => x.results.filter(x => x.success).length).reduce(add, 0),
      failingMonitors: results.map(x => x.results.filter(x => !x.success).length).reduce(add, 0),
    }

    console.log([
      chalk[counts.failingMonitorSets ? 'red' : 'green'](`Elasped Time: ${logElapsedTime(elapsedTime)}`),
      chalk[counts.failingMonitorSets ? 'red' : 'green'](`Passing Monitor Sets: ${counts.successfulMonitorSets}/${counts.monitorSets}`),
      chalk[counts.failingMonitors ? 'red' : 'green'](`Passing Monitors: ${counts.successfulMonitors}/${counts.monitors}`),
    ].join('\n'))
  }
}

module.exports = (...args) => new RunAllMonitorSets(...args)
