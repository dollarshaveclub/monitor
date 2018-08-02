
const ms = require('ms')

const hrtimeToMS = (diff) => diff[0] * 1e3 + diff[1] * 1e-6

const getElapsedTime = (start) => Math.round(hrtimeToMS(process.hrtime(start)))

const logElapsedTime = (ms) => ms > 1000 ? `${ms / 1000}s` : `${ms}ms`

const toMS = (x, defaultMS) => {
  if (typeof x === 'string') return ms(x)
  if (typeof x === 'number') return x
  return ms(defaultMS)
}

const sleep = interval => new Promise(resolve => setTimeout(resolve, toMS(interval || 100)).unref())

const createTimeoutError = (message) => {
  const err = new Error(message)
  err.code = 'ETIMEDOUT'
  return err
}

const getDuplicates = (array) => {
  let s = {},
    j = {};
  for (let i = 0; i < array.length; i++) {
    let k = String(array[i]);
    if (s[k] === undefined) {
      s[k] = 1;
    } else {
      j[k] = 1;
    }
  }
  return Object.keys(j);
}

const concat = (a, b) => a.concat(b)
const add = (a, b) => a + b

Object.assign(exports, {
  hrtimeToMS,
  getElapsedTime,
  logElapsedTime,
  toMS,
  createTimeoutError,
  sleep,
  getDuplicates,
  concat,
  add,
})
