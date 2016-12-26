//instants object
var config = {
  //used for spider
  spider: {
    //million seconds betweene first round finished and second round start
    spiderFrequency: 60 * 1000,
    //months used for sales count and lowest price statistics
    statisticsMonths: 6,
    //million seconds used for implicity wait
    implicityWait: 2 * 1000,
    //million seconds used for dersisted items info expired time
    persistExpiredTime: 600 * 1000,
    //file used for itemsInfo persistence
    itemsFile: 'items.json',
    //million seconds used for timeout of load page
    timeout: 60 * 1000,
    //millions seconds used for valid check between insert of same item
    invalidInsertTimeElapse: 12 * 60 * 60 * 1000
  },
  months: [
    '', 'one month', 'two months', 'three months', 'four months', 'five months',
    'half year', 'senven months', 'eight months', 'nine months', 'ten months',
    'eleven months', 'one year'
  ],

  //Used for http server
  httpPort: 3000
}

var spiderInfo = {
  itemsInfo: [],
  id: 1,
  emptyItem: {
      id: 'empty',
      image: '',
      title: '',
      price: '',
      percentage: '',
      rating: '',
      reviews: '',
      href: ''}
}

exports.spiderInfo = spiderInfo
exports.config = config
