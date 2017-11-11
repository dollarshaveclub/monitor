# @dollarshaveclub/monitor

[![CircleCI](https://circleci.com/gh/dollarshaveclub/monitor/tree/master.svg?style=svg&circle-token=8d27ba25d161dbd81a19eddea92f6e3f69f8c218)](https://circleci.com/gh/dollarshaveclub/monitor/tree/master)
[![codecov](https://codecov.io/gh/dollarshaveclub/monitor/branch/master/graph/badge.svg?token=7dgu14EsZp)](https://codecov.io/gh/dollarshaveclub/monitor)
[![Greenkeeper badge](https://badges.greenkeeper.io/dollarshaveclub/monitor.svg?token=882bf829fa5624cf562abac32aa14c00e2b636aa738c8bd72593b26740655743&ts=1510381924742)](https://greenkeeper.io/)

A remote uptime monitoring framework for running monitors as a CRON job.

At Dollar Shave Club, we run our monitors using CircleCI 2 Scheduled Workflows.
You can see the test monitors for this repository running every minute here: https://circleci.com/gh/dollarshaveclub/workflows/monitor/tree/master.
See our [CircleCI 2 Config](.circleci/config.yml).

## Motivation

By switching to this monitoring solution from [New Relic Synthetics](https://newrelic.com/synthetics/pricing), we were able to:

- Save hundreds of dollars on New Relic Synthetics costs
- Run our monitors every minute instead of every 5 minutes
- Test our monitoring scripts, both API and Browser scripts, outside of New Relic's console. We were unable to do this with our Terraform setup.
- Use these monitoring scripts as tests for our Dynamic QA environments (our version of [Heroku Review Apps](https://devcenter.heroku.com/articles/github-integration-review-apps))
  - Additionally, we can develop monitors as the same time as our features, allowing us to merge them at once
- Able to easily create and manage hundreds of monitors, which is difficult with Terraform (excessive copy pasta) and any UI-based monitors

Because our monitors only use 1 CircleCI container, we essentially pay $50/month for unlimited monitors as long those monitors run in less than 1 minute. Some downsides to this setup is:

- Contention with your other tests. If you run out of CircleCI 2 containers, your monitors will queue then run in bursts.
- May not be as fast as running monitors as Kubernetes jobs as CircleCI does many commands like `npm install` on every build, which could be slower than just pulling a docker container. However, having a CircleCI UI is a lot better.

What about features other monitoring solutions provide?

- We pipe all our metrics to Datadog and create all the relevant dashboards
- We still use other services like New Relic for features we need, just not for monitoring everything

## Running Monitors

There are two ways to run these monitors.

### Locally

To run monitors locally:

```bash
./node_modules/.bin/dsc-monitor 'monitors/**/*.js'
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
mkdir my-monitors # whatever your repo is called
cd my-monitors
npm init
npm i --save @dollarshaveclub/monitors
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

All monitoring set is defined in `monitors/`.
Each set is a module with:

- `exports.id<String> = __filename [optional]` - an ID for your monitor set, defaulting to the filename
- `exports.slowThreshold<Number|String> = 30s [optional]` - slow threshold for the entire monitor set
- `exports.monitors<Array>` - an array of monitors with the following properties:
  - `id<String> required` - the ID of the monitor
  - `parameters<Object> [optional]` - parameters to send to the monitor function and for data purposes
  - `monitor<Function>(monitorConfig, monitorSetConfig) [required]` - the monitor function, which is passed this monitor object as well as `exports`
  - `timeout<Number|String> = '5s' [optional]` - timeout for the monitor before it's considered a failure
  - `slowThreshold<Number|String> = '1s' [optional]` - slow threshold for a monitor
  - `retries<Number> = 1 [optional]` - number of times to retry a failing monitor

<!-- - Optional functions to run within the life cycle of the monitoring set:
  - `exports.beforeAll<Function>`
  - `exports.afterAll<Function>`
  - `exports.beforeEach<Function>`
  - `exports.afterEach<Function>` -->

What certain fields do:

- `slowThreshold` - turns the color of the time from `green` to `yellow` when a monitor or set of monitors take this amount of time

## Notes

### Scheduling Monitors

#### CircleCI

See CircleCI 2 workflow scheduling: https://circleci.com/docs/2.0/workflows/#scheduling-a-workflow. You can work off our [.circleci/config.yml](.circleci/template.config.yml) template

See all builds on master of workflow `monitor` without a commit attached to it: https://circleci.com/gh/dollarshaveclub/monitor/tree/master
Or just look at the `monitor` workflow: https://circleci.com/gh/dollarshaveclub/workflows/monitor/tree/master
