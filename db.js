var mongoClient = require('mongodb').MongoClient;

var url = 'mongodb://localhost:27017/accounts';

var singleton = null;

module.exports.connect = function(options, callback) {
  if(singleton) {
    process.nextTick(function() {
      callback(null, singleton);
    });
  } else {
    mongoClient.connect(url, function(err, result) {
      if(!err) {
        singleton = result;
      }
      callback(err,result);
    });
  }
}

module.exports.close = function() {
  if(singleton) {
    singleton.close();
    singleton = null;
  }
}

