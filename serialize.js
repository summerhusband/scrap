var fs = require('fs');
const winston = require('winston')
var globalVariable = require('./globalVariable.js')

function writeItemsToDisk (items, idCur, itemsFile) {
  var items_persist = {
    items: items,
    idCur: idCur,
    timestamp: new Date()
  }
  winston.log('info', 'Ser: write items info into items.json')
  fs.writeFileSync("items.json", JSON.stringify(items_persist, null, 2))
}

//load items info from disk if exists and not expired
function loadItemsFromDisk(itemsFile) {
  winston.log('info', 'Ser: try to load from file %s', itemsFile)
  if (fs.existsSync(itemsFile)) {
    var itemsDeser = JSON.parse(fs.readFileSync(itemsFile))
    var serTime = new Date (itemsDeser.timestamp)
    var curTime = new Date()
    winston.log('info', 'Ser: last write time: ' + serTime + ' read time: ' + curTime)
    if((curTime - serTime) < globalVariable.config.spider.persistExpiredTime) {
      winston.log('info', 'Ser: persisted items is valid, read in.')
      globalVariable.spiderInfo.itemsInfo = itemsDeser.items
      globalVariable.spiderInfo.id = itemsDeser.idCur
    } else {
      winston.log('info', 'Ser: persisted items is expired for ' + (curTime - serTime), 'ms, ignore.')
    }
  }
}

exports.writeItemsToDisk = writeItemsToDisk
exports.loadItemsFromDisk = loadItemsFromDisk
