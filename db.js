var mongodb = require('mongodb')
const winston = require('winston')
var MongoClient = mongodb.MongoClient
var globalVariable = require('./globalVariable.js')
var url = 'mongodb://10.67.71.177:27017/amazon'

function inspectHistory(countFilter) {
  MongoClient.connect(url, function (err, db) {
    if (err) {
      winston.debug('info', 'DB: Unable to connect to the mongoDB server. Error:', err)
    } else {
      winston.info('info', 'DB: Connection established to', url)
      var history = db.collection('history')
      history.group(['title'], {}, {"count":0}, function (obj, prev) {
        prev.count++;
      },
      function(err, results) {
        results.forEach((item)=> {
          if(item.count >= countFilter)
            winston.log('info', item)
        })
        db.close()
      })
    }
  })
}

function getMonthsAgo (num) {
  var monthsAgo = new Date()
  monthsAgo.setMonth(monthsAgo.getMonth() - num)
  return monthsAgo
}

function getSaleCountLowestPrice(title, monthDuration, callback) {
  cnt = 0
  lowestPrice = 'unknow'
  monthsAgo = getMonthsAgo(monthDuration)

  MongoClient.connect(url, function (err, db) {
    if (err) {
      winston.debug('info', 'DB: Unable to connect to the mongoDB server. Error:', err)
    } else {
      winston.debug('info', 'DB: Connection established to', url)
      var history = db.collection('history')
      history.count({title: title, salesTime: {$gte: monthsAgo}}, (err, count)=> {
        cnt = count
        if(cnt > 0){
          history.distinct('price', {title: title, salesTime: {$gte: monthsAgo}})
          .then(function (prices) {
            prices.sort(function (a, b) {
              a = a.substr(1)
              b = b.substr(1)
              aInt = parseInt(a)
              bInt = parseInt(b)
              return (a - b)
            })
            if(prices.length > 0){
              winston.debug('info', prices)
              lowestPrice = prices[0]
            }
            winston.debug('info', 'DB: count:' + cnt + ' price:' + lowestPrice)
            db.close()
            callback(cnt, lowestPrice)
          })
        } else {
          db.close()
          callback(cnt, lowestPrice)
        }
      })
    }
  })
}

function find (title) {
  MongoClient.connect(url, function (err, db) {
    if (err) {
      winston.debug('info', 'DB: Unable to connect to the mongoDB server. Error:', err)
    } else {
      winston.debug('info', 'DB: Connection established to', url)
      var history = db.collection('history')
      history.find({title: title}).toArray()
      .then((aItems)=> {
        aItems.forEach((item)=> {
          winston.log('info', '%j', item)
        })
        db.close()
      })
    }
  })
}

function validCheck(item, callback) {
  MongoClient.connect(url, function (err, db) {
    if (err) {
      winston.debug('info', 'DB: Unable to connect to the mongoDB server. Error:', err)
    } else {
      winston.debug('info', 'DB: Connection established to', url)
      var history = db.collection('history')
      history.find({title: item.title}).sort({salesTime: -1}).toArray()
      .then((aItems)=> {
        if(aItems.length > 0) {
          timeElapse = item.salesTime - aItems[0].salesTime
          if(timeElapse > globalVariable.config.spider.invalidInsertTimeElapse) {
            db.close()
            callback(true)
          } else {
            winston.log('info', 'DB: invalid' + item.title + ', last insert: ' +
            aItems[0].salesTime + ' this insert: ' + item.salesTime)
            db.close()
            callback(false)
          }
        } else {
          db.close()
          callback(true)
        }
      })
    }
  })
}

function insert(item) {
  MongoClient.connect(url, function (err, db) {
    if (err) {
      winston.debug('info', 'DB: Unable to connect to the mongoDB server. Error:', err)
    } else {
      winston.debug('info', 'DB: Connection established to', url)
      var history = db.collection('history')
      var time = new Date()
      var itemDb = {
        title: item.title,
        price: item.price,
        salesTime: time
      }
      validCheck(itemDb, (isValid)=> {
        if(isValid) {
          history.insertOne(itemDb, function (err, result) {
            if(err)  {
              winston.log(err);
            } else {
              winston.log('info', "DB: insert item success: %j", itemDb)
            }
            db.close()
          })
        }
      })
    }
  })
}

// var test_items = [
//      {title: '爱维杰龙 全球通双USB旅行转(白色)',
//       price: '¥6'
//     }
// ]

//isValid('【双12预热自营秒杀】世界葡萄酒巨头澳洲洛神山庄 梅洛红葡萄酒750ml*6');
//insert(test_items)
inspectHistory(1)
// getSaleCountLowestPrice('爱维杰龙 全球通双USB旅行转换插座(白色)', 6, function(cnt, price) {
//   winston.log('info', cnt)
//   winston.log('info', price)
//  })
//winston.log('info',getMonthsAgo(1))
exports.insert = insert
exports.getSaleCountLowestPrice = getSaleCountLowestPrice
