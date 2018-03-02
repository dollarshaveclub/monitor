
require('../helpers/monitor-browser-selector')(exports, [
  {
    url: 'https://google.com/',
    selector: '#viewport',
  },
], {
  disableAnalytics: true,
})
