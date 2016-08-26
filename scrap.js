/**
 * Created by I300407 on 8/12/2016.
 */
var webdriver = require('selenium-webdriver'),
    By = webdriver.By,
    WebElement = webdriver.WebElement;
error = webdriver.error
StaleElementReferenceError = error.StaleElementReferenceError;
until = webdriver.until;
var async = require('async')
var fs = require('fs');
var express = require('express')
var path = require('path')

function fetchTitle (x) {
    return function (callback) {
        driver.wait(until.elementLocated(By.id('dealTitle')), timeOut).then(function () {
            driver.findElement(By.id('100_dealView' + x)).then(function (li) {
                li.findElement(By.id('dealTitle')).findElement(By.css('a')).getAttribute('title').then(function (title) {
                    callback(null, title)
                })
            })
        })
    }
}

function fetchHref (x) {
    return function (callback) {
        driver.wait(until.elementLocated(By.id('dealTitle')), timeOut).then(function () {
            driver.findElement(By.id('100_dealView' + x)).then(function (li) {
                li.findElement(By.id('dealTitle')).findElement(By.css('a')).getAttribute('href').then(function (href) {
                    callback(null, href)
                })
            })
        })
    }
}

function fetchPercentage (x) {
    return function (callback) {
        driver.wait(until.elementLocated(By.id('dealPercentClaimed')), timeOut).then(function () {
            driver.findElement(By.id('100_dealView' + x)).then(function (li) {
                percentagePromise = li.findElement(By.id('dealPercentClaimed')).getText()
                percentagePromise.then(function (percentage) {
                    var percentIndex = percentage.indexOf('%')
                    var percent = percentage.substring(0, percentIndex)
                    callback(null, percent)
                })
                percentagePromise.catch(function (ex) {
                    if (ex instanceof StaleElementReferenceError) {
                        console.log('catch StaleElementReferenceError, retry to get percentage')
                        li.findElement(By.id('dealPercentClaimed')).getText().then(function (price) {
                            callback(null, price)
                        })
                    } else {
                        throw e
                    }
                })
            })
        })
    }
}

function fetchImage (x) {
    return function (callback) {
        driver.wait(until.elementLocated(By.id('dealImage')), timeOut).then(function () {
            driver.findElement(By.id('100_dealView' + x)).then(function (li) {
                li.findElement(By.id('dealImage')).then(function (img) {
                    img.getAttribute('src').then(function (src) {
                        callback(null, src)
                    })
                })
            })
        })
    }
}

function fetchPrice (x) {
    return function (callback) {
        driver.findElement(By.id('100_dealView' + x)).then(function (li) {
            li.findElements(By.id('dealDealPrice')).then(function (elements) {
                if(elements.length>0) {
                    pricePromise = elements[0].findElement(By.css('b')).getText()
                    pricePromise.then(function (price) {
                        callback(null, price)
                    })
                    pricePromise.catch(function (ex) {
                        if (ex instanceof StaleElementReferenceError) {
                            console.log('catch StaleElementReferenceError, retry to get price')
                            elements[0].findElement(By.css('b')).getText().then(function (price) {
                                callback(null, price)
                            })
                        } else {
                            throw e
                        }
                    })
                }
                else {
                    callback(null, null)
                }
            })
        })
    }
}

function fetchRating (x) {
    return function (callback) {
        driver.findElement(By.id('100_dealView' + x)).then(function (li) {
            li.findElements(By.id('dealRating')).then(function (elements) {
                if (elements.length>0) {
                    li.findElement(By.id('dealRating')).findElement(By.css('img')).then(function (img) {
                        img.getAttribute('src').then(function (src) {
                            callback(null, src)
                        })
                    })
                }
                else callback(null, null)
            })
        })
    }
}

function fetchReviews (x) {
    return function (callback) {
        driver.findElement(By.id('100_dealView' + x)).then(function (li) {
            li.findElements(By.id('dealReviewsCount')).then(function (elemnts) {
                if (elemnts.length>0) {
                    li.findElement(By.id('dealReviewsCount')).getAttribute("textContent").then(function (reviews) {
                        var leftParenthesis = reviews.indexOf('(')
                        var rightParenthesis = reviews.indexOf(')')
                        var reviewCount = reviews.substring((leftParenthesis + 1), rightParenthesis)
                        callback(null, reviewCount)
                    })
                }
                else callback(null, null)
            })
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
    console.log('Emit UPDATE event for item ' + targetItem.title + ' after id '+ afterId)
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
    itemsInfo.push(item)
    itemsInfo.sort(itemCompare)
    var index = itemsInfo.indexOf(item)
    var afterId = -1
    if(index != 0)
        afterId = (itemsInfo[index-1]).id
    io.emit('addItem', {item: item, afterId: afterId})
    console.log('Emit ADD event for new item ' + item.title + ' after id' + afterId)
}

function itemProcessor(x) {
    return function(callback) {
        driver.wait(until.elementLocated(By.id('100_dealView' + x))).then(function (li) {
            li.findElements(By.className('ldtimercont')).then(function (elements) {
                if(elements.length>0) {
                    console.log('handle item ' + '100_dealView' + x + ' on page ' + currentPageNo)
                    var fetchJobs = {
                        image: fetchImage(x),
                        title: fetchTitle(x),
                        price: fetchPrice(x),
                        percentage: fetchPercentage(x),
                        rating: fetchRating(x),
                        reviews: fetchReviews(x),
                        href: fetchHref(x)
                    }
                    async.parallel(fetchJobs, function (err, results) {
                        if (needAdd(results))
                            addItem(results)
                        else {
                            if (needDelete(results))
                                deleteItem(results)
                            else {
                                if (needUpdate(results))
                                    updateItem(results)
                                else
                                    console.log('No change for item ' + results.title)
                            }
                        }
                        callback(null, null)
                    })
                } else {
                    console.log('pass item')
                    callback(null, null)
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
    driver.wait(until.elementLocated(By.id('dealCurrentPage')), timeOut).getText().then(function (currentPage) {
        currentPageNo = currentPage
        driver.findElement(By.className('ulResized ldshoveler')).findElements(By.css('li')).then(function (items) {
            var jobsOnPage = []
            for (i = 0; i < items.length; i++) {
                jobsOnPage.push(itemProcessor(i))
            }
            console.log("\nhandle job on page" + currentPage)
            async.parallel(jobsOnPage, callback)
        })
    })
}

function click(callback) {
    isNextPageLoaded = false
    console.log('click')
    driver.findElement(By.id('dealCurrentPage')).then(function (oldCurrentPage) {
        driver.wait(until.elementLocated(By.id('rightShovel')), timeOut).click().then(function () {
            driver.wait(function () {
                driver.wait(until.elementLocated(By.id('dealCurrentPage')), timeOut).then(function (currentPage) {
                    WebElement.equals(oldCurrentPage, currentPage).then(function (isOldPage) {
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

function populateJob(totalPages) {
    for (i = 1; i < totalPages; i++) {
        jobs.push(handleOnePage)
        jobs.push(click)
    }
    jobs.push(handleOnePage)
}

function postProcess(err, results)
{
    console.log('#Round ' + count + ' finished at ' + (new Date()))
    count++
    setTimeout(spider, interval)
}

function spider() {
    promise = driver.get("http://www.z.cn")
    promise.then(function () {
        waitPormise = driver.wait(until.elementLocated(By.id('dealTotalPages')), timeOut)
        waitPormise.catch(function (ex) {
            console.log('catch exception in wait: ' + ex)
            spider()
        })
        waitPormise.then(function (element) {
            element.getText().then(function (totalPages) {
                jobs = []
                populateJob(parseInt(totalPages))
                async.series(jobs, postProcess)
            })
        })
    })
    promise.catch(function (ex) {
        console.log('catch exception in get' + ex)
        if (ex instanceof TimeoutError) {
            console.log('cat not visit www.z.cn, try again')
            spider()
        } else {
            throw ex
        }
    })
}

function getSpiderFrequency () {
    var config = JSON.parse(fs.readFileSync('config.json'));
    return config.spider_frequency;
}

var itemsInfo = []
var jobs = []
var driver
var currentPageNo
var count = 1
var id = 1

var interval = parseInt(getSpiderFrequency(), 10) * 1000
var app = express();

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
    console.log('App is listening on port 3000!');
});

var emptyItem = {
    id: 'empty',
    image: '',
    title: '',
    price: '',
    percentage: '',
    rating: '',
    reviews: '',
    href: ''}

app.get('/', function (req, res, next) {
    res.render('index', {items: itemsInfo, itemTemplate: emptyItem})
})

var timeOut = 1800 * 1000

new webdriver.Builder().forBrowser('chrome').buildAsync().then(function (drive) {
    driver = drive
    //driver.manage().timeouts().pageLoadTimeout(3 * 1000)
    //driver.manage().timeouts().implicitlyWait(3 * 1000)
    spider()
})