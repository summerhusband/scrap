var mongodb = require('mongodb')
const winston = require('winston')
var MongoClient = mongodb.MongoClient
var url = 'mongodb://10.67.71.177:27017/amazon'
var test_items = [
    {title: 't1',
     price: 21},
    {title: 't1',
     price: 21}
]

function insert(items) {
  MongoClient.connect(url, function (err, db) {
    if (err) {
      winston.log('info', 'Unable to connect to the mongoDB server. Error:', err)
    } else {
      winston.log('info', 'Connection established to', url)
      var history = db.collection('history')
      var time = new Date()
      items.forEach((item)=> {
        var itemDb = {
          title: item.title,
          price: item.price,
          salesTime: time
        }
        history.insert(itemDb, function (err, result) {
          if(err)  {
            winston.log(err);
          } else {
            winston.log('info', "insert item success: %j", itemDb)
          }
        })
      })
      db.close()
    }
  })
}

exports.insert = insert
