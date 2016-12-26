/**
 * Created by I300407 on 8/12/2016.
 */
var webdriver = require('selenium-webdriver'),
    By = webdriver.By,
    WebElement = webdriver.WebElement;
    until = webdriver.until;
var async = require('async')
const winston = require('winston')
winston.level= 'debug'
var persistence = require('./serialize.js')
var db_layer = require('./db.js')
var globalVariable = require('./globalVariable.js')
var config = globalVariable.config
var spiderInfo = globalVariable.spiderInfo

function fetchTitle (itemNo) {
  return function (callback) {
    driver.wait(until.elementLocated(By.id('dealTitle')), config.spider.timeout)
    .then(()=>{
      driver.findElement(By.id('100_dealView' + itemNo))
      .findElement(By.id('dealTitle'))
      .findElement(By.css('a'))
      .getAttribute('title')
      .then((title)=>{
        winston.debug('debug', 'Spider: get title %s for item ', title, itemNo)
        callback(null, title)
      })
      .catch((err)=> {callback('fetch title error', null)})
    })
  }
}

function fetchHref (itemNo) {
  return function (callback) {
    driver.wait(until.elementLocated(By.id('dealTitle')), config.spider.timeout)
    .then(()=>{
      driver.findElement(By.id('100_dealView' + itemNo))
      .findElement(By.id('dealTitle'))
      .findElement(By.css('a'))
      .getAttribute('href')
      .then((href)=>{
        winston.log('debug', 'Spider: get href %s for item ', href, itemNo)
        callback(null, href)
      })
      .catch((err)=> {callback('fetch href error', null)})
    })
  }
}

function fetchPercentage (itemNo) {
  return function (callback) {
    driver.wait(until.elementLocated(By.id('dealPercentClaimed')), config.spider.timeout)
    .then(()=>{
      driver.findElement(By.id('100_dealView' + itemNo))
      .findElement(By.id('dealPercentClaimed'))
      .getText()
      .then((percentage)=>{
        var percentIndex = percentage.indexOf('%')
        var percent = percentage.substring(0, percentIndex)
        winston.log('debug', 'Spider: get percentag %s for item ', percent, itemNo)
        callback(null, percent)
      })
      .catch((err)=> {callback('fetch percentage error', null)})
    })
  }
}

function fetchImage (itemNo) {
  return function (callback) {
    driver.wait(until.elementLocated(By.id('dealImage')), config.spider.timeout)
    .then(()=>{
      driver.findElement(By.id('100_dealView' + itemNo))
      .findElement(By.id('dealImage'))
      .getAttribute('src')
      .then((src)=>{
        winston.log('debug', 'Spider: get image %s for item ', src, itemNo)
        callback(null, src)
      })
      .catch((err)=> {callback('fetch image error', null)})
    })
  }
}

function fetchPrice (itemNo) {
  return function (callback) {
    driver.findElement(By.id('100_dealView' + itemNo))
    .findElement(By.id('dealDealPrice'))
    .findElement(By.css('b'))
    .getText()
    .then((price)=>{
      callback(null, price)
      winston.log('debug', 'Spider: get price %s for item ', price, itemNo)
    })
    .catch((err)=> {callback('fetch price error', null)})
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
        .then((src)=>{
          winston.log('debug', 'Spider: get rating %s for item ', src, itemNo)
          callback(null, src)
        })
        .catch((err)=> {callback('fetch rating error', null)})
      } else {
        winston.log('info','Spider: no rating available for dealView ' + itemNo)
        callback(null, null)
      }
    })
    .catch((err)=> {callback('fetch rating error', null)})
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
          winston.log('debug', 'Spider: get reviews count %s for item ', reviewCount, itemNo)
          callback(null, reviewCount)
        })
        .catch((err)=> {callback('fetch reviews error', null)})
      } else {
        winston.log('info','Spider: no review count available for item ' +　itemNo)
        callback(null, 0)
      }
    })
  }
}

function updateItem(index, percentage, callback) {
  var targetItem = itemsInfo[index]
  targetItem.percentage = percentage
  itemsScanCur.push(targetItem)
  itemsInfo.sort(itemCompare)
  var newIndex = itemsInfo.indexOf(targetItem)
  var afterId = -1
  if(newIndex != 0)
      afterId = itemsInfo[newIndex-1].id
  io.emit('updateItem', {item: targetItem, afterId: afterId})
  winston.log('info', 'Web: Emit UPDATE event for item ' + targetItem.title + ' after id '+ afterId)
  callback(null, null)
}

function deleteItem(index, callback) {
  var targetItem = itemsInfo[index]
  itemsScanCur.push(targetItem)
  itemsInfo.splice(index, 1)
  io.emit('deleteItem', targetItem)
  winston.log('info', 'Web: Emit DELETE event for item ' + targetItem.title)
  callback(null, null)
}

function addItem(title, percentage, remainInfo, callback) {
  var item = remainInfo
  item.title = title
  item.percentage = percentage
  item.id = id
  itemsScanCur.push(item)
  id++
  db_layer.getSaleCountLowestPrice(title, config.spider.statisticsMonths, (cnt, price)=> {
    item.saleCountInSixMonth = cnt
    if (price == 'unknow')
      price = item.price
    item.lowestPriceInSixMonth = price
    winston.debug('info', 'Web: count is: ' + cnt + 'lowest price is: ' + price)
    itemsInfo.push(item)
    itemsInfo.sort(itemCompare)
    var index = itemsInfo.indexOf(item)
    var afterId = -1
    if(index != 0)
      afterId = (itemsInfo[index-1]).id
    io.emit('addItem', {item: item, afterId: afterId})
    winston.log('info', 'Web: Emit ADD event for new item ' + item.title + ' after id' + afterId)
    callback(null, null)
  })
}

function findIndex(title) {
  var index = -1
  for(var i=0; i<itemsInfo.length; i++) {
    if(itemsInfo[i].title === title){
      index = i
      break
    }
  }
  return index
}

function handleItemExist(itemIndex, percentage, callback) {
  //this item exists, only fetch sales percentage
  if(itemsInfo[itemIndex].percentage === percentage) {
    winston.log('info', 'Spider: no change for item ' + itemsInfo[itemIndex].title)
    itemsScanCur.push(itemsInfo[itemIndex])
    callback(null, null)
  } else {
    if(percentage === '100') {
      deleteItem(itemIndex, callback)
    } else {
      winston.log('info', 'old: ' + itemsInfo[itemIndex].percentage + 'new: ' + percentage)
      updateItem(itemIndex, percentage, callback)
    }
  }
}

function handleItemNotExist(title, percentage, item_no, callback) {
  if(percentage === '100') {
    winston.log('info', 'Spider: Met 100% item, ignore')
    callback(null, null)
  } else {
    //no such item exists, add it
    var fetchJobs = {
      image: fetchImage(item_no),
      price: fetchPrice(item_no),
      rating: fetchRating(item_no),
      reviews: fetchReviews(item_no),
      href: fetchHref(item_no)
    }
    async.parallel(fetchJobs, function (err, remainInfo) {
      if(err) {
        winston.log('info', 'Spider: get element failed with err %s, ignore', err)
        callback(null, null)
      } else {
        addItem(title, percentage, remainInfo, callback)
      }
    })
  }
}

function handleItemNotStarted(viewli, callback) {
  winston.log('info', 'Spider: item is not started')
  viewli.getText().then(function (text) {
    winston.log('info', text)
    reachNotStarted = true
    callback(null, null)
  })
}

function handleItemNotUse(viewli, callback) {
  viewli.getAttribute("outerHTML")
  .then(function (liHtml) {
    winston.log('info', liHtml)
    winston.log('info', 'Spider: pass item')
    callback(null, null)
  })
}

function getTitlePercentage(item_no, callbackItem, callbackGet) {

}

function itemProcessor(item_no) {
  return function(callback) {
    driver.wait(until.elementLocated(By.id('100_dealView' + item_no)))
    .then(function (li) {
      winston.log('info', 'Spider: handle item ' + '100_dealView' + item_no)
      li.findElements(By.className('ldtimercont'))
      .then(function (elements) {
        if(elements.length>0) {
          var getTitlePercentage = {
            title: fetchTitle(item_no),
            percentage: fetchPercentage(item_no)
          }
          async.parallel(getTitlePercentage, function (err, titlePercentage) {
            if(err) {
              winston.log('info', 'get title or percentage error %s, ignore', err)
              callback(null, null)
            } else {
              var itemIndex = findIndex(titlePercentage.title)
              if(itemIndex > -1) {
                handleItemExist(itemIndex, titlePercentage.percentage, callback)
              } else {
                li.findElements(By.id('dealActionContent'))
                .then(function (actionElements) {
                  if(actionElements.length > 0) {
                    handleItemNotExist(titlePercentage.title, titlePercentage.percentage, item_no, callback)
                  } else {
                    winston.log('info', 'met closed item, ignore')
                    callback(null, null)
                  }
                })
              }
            }
          })
        } else {
          li.findElements(By.id('timerContent'))
          .then(function (notStartElements) {
            if(notStartElements.length > 0) {
              handleItemNotStarted(li, callback)
            } else {
              handleItemNotUse(li, callback)
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
      winston.log('info', 'Spider: reached not started page, ignore handle page')
      callback(null, null)
  } else {
    driver.wait(until.elementLocated(By.id('dealCurrentPage')), config.spider.timeout)
    .getText()
    .then(function (currentPage) {
      driver.findElement(By.className('ulResized ldshoveler'))
      .findElements(By.css('li'))
      .then(function (items) {
        var jobsOnPage = []
        for (i = 0; i < items.length; i++) {
          jobsOnPage.push(itemProcessor(i))
        }
        winston.log('info', 'Spider: handle job on page' + currentPage)
        async.series(jobsOnPage, (err)=> {
            callback(null, null)
        })
      })
    })
  }
}

function click(callback) {
  if(reachNotStarted) {
      winston.log('info', 'Spider: reached not started page, ignore click')
      callback(null, null)
  } else {
    isNextPageLoaded = false
    winston.log('info', 'Spider：click')
    driver.findElement(By.id('dealCurrentPage')).then(function (oldCurrentPage) {
      driver.wait(until.elementLocated(By.id('rightShovel')), config.spider.timeout)
      .click()
      .then(()=>{
        driver.wait(()=>{
          driver.wait(until.elementLocated(By.id('dealCurrentPage')), config.spider.timeout)
          .then(function (currentPage) {
            WebElement.equals(oldCurrentPage, currentPage)
            .then((isOldPage)=>{
              if (!isOldPage)
                isNextPageLoaded = true
            })
          })
          return isNextPageLoaded
        })
        .then(()=> {callback(null, null)})
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
    winston.log('info', 'Spider: #Round ' + roundCount + ' finished at ' + (new Date()))
    roundCount++
    removeDissapear()
    mongoInsertItems()
    io.emit('syncTime', {})
    persistence.writeItemsToDisk(itemsInfo, id, config.spider.itemsFile)
    reachNotStarted = false
    itemsScanPre = itemsScanCur
    itemsScanCur = []
    setTimeout(spider, config.spider.spiderFrequency)
}

function mongoInsertItems() {
  itemsScanPre.forEach(function (preItem) {
    var notFound = true
    itemsScanCur.forEach(function (curItem) {
      if(preItem.title === curItem.title) {
        notFound = false
      }
    })
    if(notFound) {
      //winston.log('info', 'insert item into mongo: ' + item.title)
      db_layer.insert(preItem)
    }
  })
  winston.debug('info', 'insert items finished')
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
      winston.log('info', 'Spider: remove dissapear item: ' + item.title)
      var index = itemsInfo.indexOf(item)
      itemsInfo.splice(index, 1)
    }
  })
  winston.debug('info', 'remove items finished')
}

function spider() {
  driver.get("http://www.z.cn")
  .then(()=>{
    driver.wait(until.elementLocated(By.id('dealTotalPages')), config.spider.timeout)
    .getText()
    .then((totalPages)=>{
      var jobs = []
      winston.log('info', 'Spider: total pages is: ' +  totalPages);
      populateJob(jobs, parseInt(totalPages))
      async.series(jobs, postProcess)
    })
  })
}

var reachNotStarted = false
var itemsInfo = spiderInfo.itemsInfo
var id = spiderInfo.id
var itemsScanPre = []
var itemsScanCur = []
var driver
var io
var roundCount = 1

function runSpider(httpIO) {
  if(itemsInfo.length > 0) {
    itemsInfo.forEach((item)=> {
      itemsScanPre.push(item)
    })
  }
  new webdriver.Builder().forBrowser('chrome').build().then(function (drive) {
      driver = drive
      io = httpIO
      driver.manage().timeouts().implicitlyWait(config.spider.implicityWait)
      spider()
  })
}
module.exports = runSpider
