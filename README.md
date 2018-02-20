# @dollarshaveclub/monitor

[![CircleCI](https://circleci.com/gh/dollarshaveclub/monitor/tree/master.svg?style=svg&circle-token=8d27ba25d161dbd81a19eddea92f6e3f69f8c218)](https://circleci.com/gh/dollarshaveclub/monitor/tree/master)
[![codecov](https://codecov.io/gh/dollarshaveclub/monitor/branch/master/graph/badge.svg?token=7dgu14EsZp)](https://codecov.io/gh/dollarshaveclub/monitor)
[![Greenkeeper badge](https://badges.greenkeeper.io/dollarshaveclub/monitor.svg?token=882bf829fa5624cf562abac32aa14c00e2b636aa738c8bd72593b26740655743&ts=1510381924742)](https://greenkeeper.io/)

A remote uptime monitoring framework for running monitors as a CRON job.

At Dollar Shave Club, we run some of our monitors using CircleCI 2 Scheduled Workflows.
You can see the test/example monitors for this repository running every minute here: https://circleci.com/gh/dollarshaveclub/workflows/monitor/tree/master.
See our [CircleCI 2 Config](.circleci/config.yml).

## Motivation

With this monitoring solution, we were able to:

- Run our monitors every minute instead of every 5 minutes
- Test both our API and Browser monitoring scripts outside of a monitoring platform's console/UI. We were unable to do this with our Terraform setup.
- Use these monitoring scripts as tests for our version of [Heroku Review Apps](https://devcenter.heroku.com/articles/github-integration-review-apps)
  - Additionally, we can develop monitors alongside our features, allowing us to  merge them simultaneously. We no longer have conflicts between our codebase and our monitors.
- Able to easily create and manage hundreds of monitors, which is difficult with Terraform (excessive copy pasta) and any UI-based monitoring platform.

Some downsides to our CircleCI Scheduled Workflow setup are:

- Contention with your other tests. If you reach your CircleCI 2 container limit, your monitors will queue then run in bursts, losing coverage momentarily.
- May not be as fast as running monitors as Kubernetes jobs because CircleCI runs many commands like `npm install` on every build,
  which could be slower than just pulling a Docker container.
  However, having a CircleCI UI is preferable.

What about features other monitoring solutions provide?

- We must setup our own dashboards and alerting
- We still use other services for features we need, just not for monitoring everything
- We don't need to run these monitors from multiple locations.
  If we do, we'll run them as Kubernetes jobs on different clusters.

## Running Monitors

There are two ways to run these monitors.

### Locally

To run monitors locally:

```bash
npx dsc-monitor 'monitors/**/*.js'
```

Run `dsc-monitor --help` for options.

NOTE: this assumes you've installed this library as a local dependency, which is installed as `dsc-monitor`.
If you're running the monitors from this repository, use `./bin/run.js`.
If you've `npm install --global @dollarshaveclub/monitor`, just run `dsc-monitor`.

### Via Docker

Copy our [Dockerfile Template](Dockerfile.template) to your repository, then run:

```bash
docker build -t dsc-monitor
docker run -t dsc-monitor 'monitors/**/*.js'
```

## Creating your Monitoring Repository

```bash
mkdir my-monitors # your repository name
cd my-monitors
npm init
npm i --save @dollarshaveclub/monitor
mkdir monitors
```

1. Create a test monitor. You can use one of [our example monitors](monitors/).
1. Add the `npm run monitors` command:
  1. Add the following `script` to your `package.json`: `"monitors": "dsc-monitor 'monitors/**/*.js'"`
  1. Run your monitors with `npm run monitors`
1. Setting up your monitors in CircleCI as a CRON job:
  1. Copy [.circleci/template.config.yml](.circleci/template.config.yml) to `.circleci/config.yml` and push

## Environment Variables

Monitor environment variables:

- `MONITOR_CONCURRENCY=1` - concurrency of monitors running at the same time
  - When `concurrency === 1`, results will stream to `stdout`
  - When `concurrency >= 1`, results will be logged one monitor set at a time
- `MONITOR_SHUFFLE` - whether to shuffle monitors and monitor sets
- `MONITOR_SHUFFLE_MONITOR_SETS` - whether to shuffle monitor sets
- `MONITOR_SHUFFLE_MONITORS` - whether to shuffle monitors within a set

## Defining Monitors

All monitoring sets are defined in `monitors/`.
Each set is a module with:

- `exports.disabled<Boolean> = false` - whether this monitor is disabled
- `exports.id<String> = __filename [optional]` - an ID for your monitor set, defaulting to the filename
- `exports.slowThreshold<Number|String> = 30s [optional]` - slow threshold for the entire monitor set
- `exports.monitors<Array>` - an array of monitors with the following properties:
  - `id<String> [required]` - the ID of the monitor
  - `parameters<Object> [optional]` - parameters to send to the monitor function and for data purposes
  - `monitor<Function>(monitorConfig, monitorSetConfig, { attempt, log }) [required]` - the monitor function, which is passed this monitor object as well as `exports`
    - `monitorConfig` - this `monitor` object
    - `monitorSetConfig` - this `exports` object
    - `attempt = 0` - the attempt # for this monitor
    - `log(str)` - a function to log in a nicely-formatted way
  - `timeout<Number|String> = '5s' [optional]` - timeout for the monitor before it's considered a failure
  - `slowThreshold<Number|String> = '1s' [optional]` - slow threshold for a monitor
  - `retries<Number> = 0 [optional]` - number of times to retry a failing monitor
- Optional functions to run within the life cycle of the monitoring set:
  - `exports.beforeAll<Function>(monitorSetConfig)`
  - `exports.afterAll<Function>(monitorSetConfig, result)`
  - `exports.beforeEach<Function>(monitorSet, monitorSetConfig, { attempt, log })`
  - `exports.afterEach<Function>(monitorSet, monitorSetConfig, { attempt, log })`

What certain fields do:

- `slowThreshold` - turns the color of the time from `green` to `yellow` when a monitor or set of monitors take this amount of time

## Plugins

Create a file named `dsc-monitor.js` with the form:

```js
module.exports = (monitorRunner) => {

}
```

Then pass it as a plugin (`-p`) when you run the monitors:

```bash
dsc-monitor -p dsc-monitor.js 'monitors/**/*.js'
```

### Events

Hook into events via `monitorRunner.events.on(<event>, callback)`. The events are:

- `monitorSet` => `(result) => {}` - when a monitor set is completed
  - `monitorSetConfig`
  - `results` - array of `monitor` results
  - `success = true|false`
  - `elapsedTime` - in milliseconds
- `monitor` => `(result) => {}` - when a monitor is completed
  - `monitorSetConfig`
  - `monitorConfig`
  - `results` - array of `monitorAttempt` results
  - `success = true|false`
  - `elapsedTime` - in milliseconds
- `monitorAttempt` => `(result) => {}` - when a monitor attempt is completed
  - `monitorSetConfig`
  - `monitorConfig`
  - `success = true|false`
  - `elapsedTime` - in milliseconds
  - `error` - if an error occured
  - `attempt = 1` - attempt #

## Notes

### Scheduling Monitors

#### CircleCI

See CircleCI 2 workflow scheduling: https://circleci.com/docs/2.0/workflows/#scheduling-a-workflow. You can work off our [.circleci/config.yml](.circleci/template.config.yml) template

See all builds on master of workflow `monitor` without a commit attached to it: https://circleci.com/gh/dollarshaveclub/monitor/tree/master
Or just look at the `monitor` workflow: https://circleci.com/gh/dollarshaveclub/workflows/monitor/tree/master
