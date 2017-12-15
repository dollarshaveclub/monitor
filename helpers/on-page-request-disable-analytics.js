
exports = module.exports = function onPageRequest (req) {
  const { url } = req
  if (exports.analyticsRegex.test(url)) {
    req.abort()
  } else {
    req.continue()
  }
}

exports.analyticsRegex = /\b(adobedtm|branch\.io|analytics\.dollarshaveclub\.com|ampush|qualtrics|googletagmanager|zendesk|inspectlet)\b/
