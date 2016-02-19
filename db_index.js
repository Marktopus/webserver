
var mongoClient = require('mongodb').MongoClient;

var url = 'mongodb://localhost:27017/example';

var singleton = null;


module.exports.connect = function(options, callback) {
  if(singleton) {
    process.nextTick(function() {
      callback(null, singleton);
    }
  }
  else {
    MongoClient.connect(url, function(err, result) {
      if(err) return callback(err);
      singleton = result;
      result.collection('visitors').ensureIndex(
        {ip: true},
        {unique: true},
        function(err) {
          if(err) return callback(err);
          callback(null, result);
        }
      );
    });
  }
};


module.exports.close = function() {
  if(singleton) {
    singleton.close();
    singleton = null;
  }
}

