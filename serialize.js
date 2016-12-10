var fs = require('fs');
const winston = require('winston')

function serialize (items, idCur) {

  var items_persist = {
    items: items,
    idCur: idCur,
    timestamp: new Date()
  }
  winston.log('info', 'write items info into items.json')
  fs.writeFileSync("items.json", JSON.stringify(items_persist, null, 2))
}

function deserialize () {
  winston.log('info', 'read items info from items.json')
  var items_parse = JSON.parse(fs.readFileSync('items.json'))
  return items_parse
}

exports.serialize = serialize
exports.deserialize = deserialize
