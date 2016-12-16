/**
 * Created by I300407 on 8/12/2016.
 */
var webdriver = require('selenium-webdriver'),
    By = webdriver.By,
    WebElement = webdriver.WebElement;
    until = webdriver.until;
var async = require('async')
var fs = require('fs');
var express = require('express')
var path = require('path')
const winston = require('winston')
var persistence = require('./serialize.js')
var db_layer = require('./db.js')

function fetchTitle (itemNo) {
  return function (callback) {
    driver.wait(until.elementLocated(By.id('dealTitle')), timeOut).then(()=>{
      driver.findElement(By.id('100_dealView' + itemNo))
      .findElement(By.id('dealTitle'))
      .findElement(By.css('a'))
      .getAttribute('title')
      .then((title)=>{callback(null, title)})
    })
  }
}

function fetchHref (itemNo) {
  return function (callback) {
    driver.wait(until.elementLocated(By.id('dealTitle')), timeOut).then(()=>{
      driver.findElement(By.id('100_dealView' + itemNo))
      .findElement(By.id('dealTitle'))
      .findElement(By.css('a'))
      .getAttribute('href')
      .then((href)=>{callback(null, href)})
    })
  }
}

function fetchPercentage (itemNo) {
  return function (callback) {
    driver.wait(until.elementLocated(By.id('dealPercentClaimed')), timeOut).then(()=>{
      driver.findElement(By.id('100_dealView' + itemNo))
      .findElement(By.id('dealPercentClaimed'))
      .getText()
      .then((percentage)=>{
        var percentIndex = percentage.indexOf('%')
        var percent = percentage.substring(0, percentIndex)
        callback(null, percent)
      })
    })
  }
}

function fetchImage (itemNo) {
  return function (callback) {
    driver.wait(until.elementLocated(By.id('dealImage')), timeOut).then(()=>{
      driver.findElement(By.id('100_dealView' + itemNo))
      .findElement(By.id('dealImage'))
      .getAttribute('src')
      .then((src)=>{callback(null, src)})
    })
  }
}

// function fetchPrice (itemNo) {
//   return function (callback) {
//     driver.findElement(By.id('100_dealView' + itemNo))
//     .findElements(By.id('dealDealPrice'))
//     .then(function (elements) {
//       if(elements.length>0) {
//         elements[0].findElement(By.css('b'))
//         .getText()
//         .then((price)=>{callback(null, price)})
//       } else {
//         callback(null, null)
//       }
//     })
//   }
// }

function fetchPrice (itemNo) {
  return function (callback) {
    driver.findElement(By.id('100_dealView' + itemNo))
    .findElement(By.id('dealDealPrice'))
    .findElement(By.css('b'))
    .getText()
    .then((price)=>{callback(null, price)})
  }
}

function fetchRating (itemNo) {
  return function (callback) {
    driver.findElement(By.id('100_dealView' + itemNo))
    .findElement(By.className('reviewsLink'))
    .getAttribute('id')
    .then((hasRating)=> {
      if(hasRating){
        driver.findElement(By.id('100_dealView' + itemNo))
        .findElement(By.id('dealRating'))
        .findElement(By.css('img'))
        .getAttribute('src')
        .then((src)=>{callback(null, src)})
      } else {
        winston.log('info','no rating available')
        callback(null, null)
      }
    })
  }
}

function fetchReviews (itemNo) {
  return function (callback) {
    driver.findElement(By.id('100_dealView' + itemNo))
    .findElement(By.className('reviewsLink'))
    .getAttribute('id')
    .then((hasRating)=> {
      if(hasRating){
        driver.findElement(By.id('100_dealView' + itemNo))
        .findElement(By.id('dealReviewsCount'))
        .getAttribute("textContent")
        .then(function (reviews) {
          var leftParenthesis = reviews.indexOf('(')
          var rightParenthesis = reviews.indexOf(')')
          var reviewCount = reviews.substring((leftParenthesis + 1), rightParenthesis)
          callback(null, reviewCount)
        })
      } else {
        winston.log('info','no review count available')
        callback(null, null)
      }
    })
  }
}

function needUpdate(itemCheck) {
  var need = false
  itemsInfo.forEach(function (item) {
    if((itemCheck.title == item.title) && (item.percentage != itemCheck.percentage) && (itemCheck.percentage != '100')) {
      need = true
    }
  })
  return need
}

function updateItem(newItem) {
  var targetItem
  itemsInfo.forEach(function (item) {
    if((newItem.title == item.title)) {
      item.percentage = newItem.percentage
      targetItem = item
    }
  })
  itemsInfo.sort(itemCompare)
  var index = itemsInfo.indexOf(targetItem)
  var afterId = -1
  if(index != 0)
      afterId = itemsInfo[index-1].id
  io.emit('updateItem', {item: targetItem, afterId: afterId})
  winston.log('info', 'Emit UPDATE event for item ' + targetItem.title + ' after id '+ afterId)
}

function needDelete(itemCheck) {
  var need = false
  itemsInfo.forEach(function (item) {
    if((itemCheck.title == item.title) && (itemCheck.percentage == '100')) {
      need = true
    }
  })
  return need
}

function deleteItem(newItem) {
  var targetItem
  itemsInfo.forEach(function (item) {
    if((newItem.title == item.title)) {
      targetItem = item
      var index = itemsInfo.indexOf(item)
      itemsInfo.splice(index, 1)
    }
  })
  io.emit('deleteItem', targetItem)
  console.log('Emit DELETE event for item ' + targetItem.title + ' with id' + targetItem.id)
}

function needAdd(itemCheck) {
  var need = true
  if(itemCheck.percentage == '100')
    return false
  itemsInfo.forEach(function (item) {
    if(itemCheck.title == item.title) {
      need = false
    }
  })
  return need
}

function addItem(item) {
  item.id = id
  id++
  db_layer.getSaleCountLowestPrice(item.title, 6, (cnt, price)=> {
    item.saleCountInSixMonth = cnt
    if (price == 'unknow')
      price = item.price
    item.lowestPriceInSixMonth = price
    winston.debug('info', 'count is: ' + cnt + 'lowest price is: ' + price)
    itemsInfo.push(item)
    itemsInfo.sort(itemCompare)
    var index = itemsInfo.indexOf(item)
    var afterId = -1
    if(index != 0)
      afterId = (itemsInfo[index-1]).id
    io.emit('addItem', {item: item, afterId: afterId})
    winston.log('info', 'Emit ADD event for new item ' + item.title + ' after id' + afterId)
  })
}

function itemProcessor(item_no) {
  return function(callback) {
    driver.wait(until.elementLocated(By.id('100_dealView' + item_no))).then(function (li) {
      li.findElements(By.className('ldtimercont')).then(function (elements) {
        if(elements.length>0) {
          winston.log('info', 'handle item ' + '100_dealView' + item_no)
          var fetchJobs = {
            image: fetchImage(item_no),
            title: fetchTitle(item_no),
            price: fetchPrice(item_no),
            percentage: fetchPercentage(item_no),
            rating: fetchRating(item_no),
            reviews: fetchReviews(item_no),
            href: fetchHref(item_no)
          }
          async.parallel(fetchJobs, function (err, results) {
            itemsScanCur.push(results)
            if (needAdd(results))
              addItem(results)
            else {
              if (needDelete(results))
                deleteItem(results)
              else {
                if (needUpdate(results))
                  updateItem(results)
                else
                  winston.log('info', 'No change for item ' + results.title)
                }
            }
            callback(null, null)
          })
        } else {
          li.findElements(By.id('timerContent')).then(function (notStartElements) {
            if(notStartElements.length > 0) {
              winston.log('info', 'item is not started')
              li.getText().then(function (text) {
                winston.log('info', text)
                reachNotStarted = true
                callback(null, null)
              })
            } else {
              li.getAttribute("outerHTML").then(function (liHtml) {
                winston.log('info', liHtml)
                winston.log('info', 'pass item')
                callback(null, null)
              })
            }
          })
        }
      })
    })
  }
}

function itemCompare(itemA, itemB) {
    if (itemB.percentage == itemA.percentage) {
        if(itemB.reivews == itemA.reviews) {
            if(itemB.price == itemA.price) {
                return (parseInt(itemB.title) - parseInt(itemA.title))
            } else {
                return (parseInt(itemB.price) - parseInt(itemA.price))
            }
        } else {
            return (parseInt(itemB.reviews) - parseInt(itemA.reviews))
        }
    } else {
        return (parseInt(itemB.percentage) - parseInt(itemA.percentage))
    }
}

function handleOnePage(callback) {
  if(reachNotStarted) {
      winston.log('info', 'reached not started page, ignore handle page')
      callback(null, null)
  } else {
    driver.wait(until.elementLocated(By.id('dealCurrentPage')), timeOut).getText().then(function (currentPage) {
      driver.findElement(By.className('ulResized ldshoveler')).findElements(By.css('li')).then(function (items) {
        var jobsOnPage = []
        for (i = 0; i < items.length; i++) {
            jobsOnPage.push(itemProcessor(i))
        }
        winston.log('info', 'handle job on page' + currentPage)
        async.parallel(jobsOnPage, callback)
      })
    })
  }
}

function click(callback) {
  if(reachNotStarted) {
      winston.log('info', 'reached not started page, ignore click')
      callback(null, null)
  } else {
    isNextPageLoaded = false
    winston.log('info', 'click')
    driver.findElement(By.id('dealCurrentPage')).then(function (oldCurrentPage) {
      driver.wait(until.elementLocated(By.id('rightShovel')), timeOut).click().then(()=>{
        driver.wait(()=>{
          driver.wait(until.elementLocated(By.id('dealCurrentPage')), timeOut).then(function (currentPage) {
            WebElement.equals(oldCurrentPage, currentPage).then((isOldPage)=>{
              if (!isOldPage)
              isNextPageLoaded = true
            })
          })
          return isNextPageLoaded
        }).then(function () {
            callback(null, null)
        })
      })
    })
  }
}

function populateJob(jobs, totalPages) {
    for (i = 1; i < totalPages; i++) {
        jobs.push(handleOnePage)
        jobs.push(click)
    }
    jobs.push(handleOnePage)
}

function postProcess(err, results)
{
    winston.log('info', '#Round ' + roundCount + ' finished at ' + (new Date()))
    roundCount++
    removeDissapear()
    mongoInsertItems()
    io.emit('syncTime', {})
    persistence.serialize(itemsInfo, id)
    reachNotStarted = false
    itemsScanPre = itemsScanCur
    itemsScanCur = []
    setTimeout(spider, spider_interval)
}

function mongoInsertItems() {
  itemsScanPre.forEach(function (item) {
    var notFound = true
    itemsScanCur.forEach(function (curItem) {
      if(item.title == curItem.title) {
        notFound = false
      }
    })
    if(notFound) {
      //winston.log('info', 'insert item into mongo: ' + item.title)
      db_layer.insert(item)
    }
  })
}

function removeDissapear() {
  itemsInfo.forEach(function (item) {
    var notFound = true
    itemsScanCur.forEach(function (curItem) {
      if(item.title == curItem.title) {
        notFound = false
      }
    })
    if(notFound) {
      winston.log('info', 'remove dissapear item: ' + item.title)
      var index = itemsInfo.indexOf(item)
      itemsInfo.splice(index, 1)
    }
  })
}

function spider() {
  driver.get("http://www.z.cn").then(()=>{
    driver.wait(until.elementLocated(By.id('dealTotalPages')), timeOut)
    .getText().then((totalPages)=>{
      var jobs = []
      winston.log('info', 'total pages is: ' +  totalPages);
      populateJob(jobs, parseInt(totalPages))
      async.series(jobs, postProcess)
    })
  })
}

function getSpiderFrequency () {
    var config = JSON.parse(fs.readFileSync('config.json'));
    return config.spider_frequency;
}

var reachNotStarted = false
var itemsInfo = []
var itemsScanPre = []
var itemsScanCur = []
var driver
var roundCount = 1
var id = 1
var timeOut = 60 * 1000
var persistExpiredTime = 60 * 1000
var spider_interval = parseInt(getSpiderFrequency(), 10) * 1000
var emptyItem = {
    id: 'empty',
    image: '',
    title: '',
    price: '',
    percentage: '',
    rating: '',
    reviews: '',
    href: ''}
var app = express();

//load items info from disk if exists
if (fs.existsSync('items.json')) {
  var itemsDeser = persistence.deserialize()
  var serTime = new Date (itemsDeser.timestamp)
  var curTime = new Date()
  winston.log('info', 'write time: ' + serTime + ' read time: ' + curTime)
  if((curTime - serTime) < persistExpiredTime) {
    winston.log('info', 'persisted items is valid, read in.')
    itemsInfo = itemsDeser.items
    id = itemsDeser.idCur
  } else {
    winston.log('info', 'persisted items is expired for ' + (curTime - serTime), 'ms, ignore.')
  }
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.static('public'));

var http = require('http').Server(app);
var io = require('socket.io')(http);
io.on('connection', function(socket){
    console.log('a user connected');
})

http.listen(3000, function () {
  console.log('App is listening on port 3000 now!');
})

app.get('/', function (req, res, next) {
    res.render('index', {items: itemsInfo, itemTemplate: emptyItem})
})

setTimeout(startRun, 5*1000)
function startRun() {
  new webdriver.Builder().forBrowser('chrome').build().then(function (drive) {
      driver = drive
      driver.manage().timeouts().implicitlyWait(60*1000)
      spider()
  })
}
