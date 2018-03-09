#!/usr/bin/env node

/* eslint no-console: 0 */

const program = require('commander')
  .version(require('../package.json').version)
  .usage('[options] <tests>')
  .option('-p, --plugin <filename>', 'add a plugin', String)
  .option('-c, --concurrency <n>', 'monitor concurrency', parseInt)
  .option('-s, --shuffle', 'shuffle monitors and monitor sets')
  .option('-sm, --shuffle-monitors', 'shuffle monitors')
  .option('-sms, --shuffle-monitor-sets', 'shuffle monitor sets')
  .option('-t, --timeout <interval>', 'timeout')
  .parse(process.argv)

const debug = require('debug')('dsc-monitor:bin')
const path = require('path')

const { toMS, logElapsedTime, sleep } = require('../lib/utils')
const findMonitorSets = require('../lib/find-monitor-sets')
const runMonitors = require('../lib')

const monitorSetConfigs = findMonitorSets(program.args)

const options = {}
if (program.concurrency && !isNaN(program.concurrency)) options.concurrency = program.concurrency
if (program.shuffleMonitorSets || program.shuffle) options.shuffleMonitorSets = true
if (program.shuffleMonitors || program.shuffle) options.shuffleMonitors = true

const runner = runMonitors(monitorSetConfigs, options)

if (program.plugin) {
  const plugin = require(path.resolve(program.plugin))
  plugin(runner)
}

runner.exec().then((results) => {
  debug('%o', results)
  if (results.every(result => result.success)) {
    process.exitCode = 0
    gracefullyExit()
    return
  }

  process.exitCode = 1
}).catch((err) => {
  console.error(err.stack || err)
  process.exitCode = 1
  gracefullyExit()
})

if (program.timeout) {
  const ms = toMS(~~program.timeout || program.timeout)
  sleep(ms).then(() => {
    console.error('Monitors did not finish in the timeout set of %s, force quitting.', logElapsedTime(ms))
    process.exit()
  })
}

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection error, exiting forcefully.')
  console.error(err.stack || err)
  process.exit(1)
})

function gracefullyExit () {
  setTimeout(() => {
    console.log('Could not gracefully exit after 30 seconds, exiting forcefully. Please check for leaks.')
    process.exit()
  }, 30 * 1000).unref()
}
