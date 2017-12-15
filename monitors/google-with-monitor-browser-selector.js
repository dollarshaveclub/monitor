
require('../helpers/monitor-browser-selector')(exports, [
  {
    url: 'https://google.com/',
    selector: '[title=Search][type=text]',
  },
], {
  disableAnalytics: true,
})
