var globalVariable = require('./globalVariable.js')
var config = globalVariable.config
var spiderInfo = globalVariable.spiderInfo
var express = require('express')
var path = require('path')
var persistence = require('./serialize.js')
var app = express()
const winston = require('winston')
// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'jade')
app.use(express.static('public'))

var http = require('http').Server(app)
var io = require('socket.io')(http)
io.on('connection', function(socket){
    winston.log('info','WEB: A user connected');
})
persistence.loadItemsFromDisk(config.spider.itemsFile)
http.listen(config.httpPort, function () {
  winston.log('info', 'WEB: App is listening on port %s now!', config.httpPort)
})
app.get('/', function (req, res, next) {
    res.render('index', {items: spiderInfo.itemsInfo, itemTemplate: spiderInfo.emptyItem})
})

var runSpider = require('./amazonSpider.js')
runSpider(io)
