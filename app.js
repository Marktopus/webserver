var express = require('express');

var app = express();
var mongo = require('./db.js');

app.get('/', function(req, res, next) {
  mongo.connect({}, function(err, db) {
    if(err) return next(err);
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    /*var doc = {
      ip: ip,
      hits: 1
    };*/
    var visitors = db.collection('visitors');
    var doc = {
      $inc: {hits: 1},
      $setOnInsert: {ip: ip}
    };

    visitors.findAndModify({ip: ip}, [ ], doc, {
      upsert: true,
      new: true
    }, function(err, result) {
      if(err) return next(err);
      res.send(result.value);
    });




    /*visitors.find({ip: ip}).toArray(function(err, docs) {
      if(err) return next(err);
      var doc = docs[0];
      if(!doc) doc = {ip: ip, hits : 0};
      doc.hits = doc.hits + 1;
      visitors.save(doc, function(err, result) {
        if(err) return next(err);
        res.send(doc);
      });
    });*/



    /*var body = '';
    db.collection('visitors').insert(doc, function(err, result) {
      if(err) return next(err);
      res.send(doc);
    });*/
  });
});


//var hitcount = require('./hitcount.js');
var motd = require('./motd.js');
var users = require('./users.js');
var items = require('./items.js');
var inventory = require('./inventory.js');

var headerMiddleware = require('./header.js');
var bodyMiddleware = require('body-parser');

var path = '/';

app.use(headerMiddleware());
app.use(bodyMiddleware.json());

//hitcount.register(app);
motd.register(app,path + 'motd/');
users.register(app,path + 'users/');
items.register(app,path + 'items/');
inventory.register(app,path + 'inventory/');
app.listen(7000);
