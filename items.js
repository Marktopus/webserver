var mongo = require('mongodb');
var myMongo = require('./db.js');
var mongoClient = mongo.MongoClient;
var redis = require('redis');
var crypto = require('crypto');
var redisClient = redis.createClient();
var async = require('async');
function makeItem(req, res) {
  var shortname = (req.body.shortname || req.query.shortname);

  var session = (req.body._session || req.query._session);
  var token = (req.body._token || req.query._token);
  
  var response = {
    status: 'success'
  };
  var data = {
  };
  if(session) {
    redisClient.hgetall(session, function(err, result) {
      if(err) return next(err);

      if(result && (result.authtoken == token)) {
        var url = 'http://localhost:27017/accounts';
        myMongo.connect(url, function(err, db) {
          if (err) return next(err);
          var userdb = db.collection('items');
          userdb.findOne( {shortname: shortname}, function(err, dbresult) {
            if(err) return next(err);
            if(dbresult) {
            // i don't 
            // fuck with
            // thiiiiisss
              response.status = 'fail';
              data.shortname = 'Already taken';
              response.reason = data;
              return res.send(JSON.stringify(response));
            } else {
              data.shortname = shortname;
              userdb.insertOne( { shortname: shortname, name: "", description: "", isStackable: false, attributes: {} }, function(err, insertresult) {
                if(err) return next(err);
                if(insertresult) {
                  data.id = insertresult.ops[0]._id;
                  response.data = data;
                  return res.send(JSON.stringify(response));
                }
              });
            }
          });
        });
      } else {
        data.session = 'invalid';
        response.status = 'fail';
        response.reason = data;
        return res.send(JSON.stringify(response));
      }
    });
  } else {
    data.session = 'invalid';
    response.status = 'fail';
    response.reason = data;
    return res.send(JSON.stringify(response));
  }
}

function getItem(req, res) {

  var id = req.params.id;
  if(id.charAt(0) == ':') {
    id = id.substr(1);
  }

  var targetID = id;
  searchTargetID = new mongo.ObjectID(id);
  
  var response = {
    status: 'success'
  };
  var data = {
  };
  var url = 'http://localhost:27017/accounts';
  myMongo.connect(url, function(err, db) {
    if (err) return next(err);
    var userdb = db.collection('items');
    userdb.findOne( {_id: searchTargetID}, function(err, dbresult) { 
      if(err) return next(err);

      if(dbresult) {
        data.id = targetID;
        data.shortname = dbresult.shortname;
        data.name = dbresult.name;
        data.description = dbresult.description;
        data.isStackable = dbresult.isStackable;
        data.attributes = dbresult.attributes;
        response.data = data;
      } else {
        data.id = 'Not found';
        response.status = 'fail';
        response.reason = data;
      }
      return res.send(JSON.stringify(response));
    });
  });
}

function updateItem(req, res) {
  var id = req.params.id;

  if(id.charAt(0) == ':') {
    id = id.substr(1);
  }
  var newName = (req.body.name || req.query.name);
  var newDesc = (req.body.description || req.query.description);
  var newIsStackable = (req.body.isStackable || req.query.isStackable);
  var newAttributes = (req.body.attributes || req.query.attributes);

  var session = (req.body._session || req.query._session);
  var token = (req.body._token || req.query._token);
  var targetID = id;
  searchTargetID = new mongo.ObjectID(id);
  
  var response = {
    status: 'success'
  };
  var data = {
  };
  if(session) {
    redisClient.hgetall(session, function(err, result) {
      if(err) return next(err);
      if(result && (result.authtoken == token)) {
        var url = 'http://localhost:27017/accounts';
        myMongo.connect(url, function(err, db) {
          if (err) return next(err);
          var itemdb = db.collection('items');
          itemdb.findOne( {_id: searchTargetID}, function(err, dbresult) {
            if(err) return next(err);
            if(dbresult) {

              data.id = id;
              if(newName) {
                data.name = newName;
                itemdb.update({_id: searchTargetID}, {$set: { name: newName } });
              }
              if(newDesc) {
                data.description = newDesc;
                itemdb.update({_id: searchTargetID}, {$set: { description: newDesc } });
              }
              if(newIsStackable) {
                data.isStackable = newIsStackable;
                itemdb.update({_id: searchTargetID}, {$set: { isStackable: newIsStackable } });
              }
              if(newAttributes) {
                data.attributes = newAttributes;
                itemdb.update({_id: searchTargetID}, {$set: { attributes: newAttributes } });
              }
              response.data = data;
              return res.send(JSON.stringify(response));
            } else {
              // i don't 
              // fuck with
              // thiiiiisss
              response.status = 'fail';
              data.id = 'Forbidden';
              response.reason = data;
              return res.send(JSON.stringify(response));
            } 
          });
        });
      } else {
        data.session = 'invalid';
        response.status = 'fail';
        response.reason = data;
        return res.send(JSON.stringify(response));
      }
    });
  } else {
    data.session = 'invalid';
    response.status = 'fail';
    response.reason = data;
    return res.send(JSON.stringify(response));
  }
}

function findItem(req, res) {
  var namesToFind = (req.body.shortnames || req.query.shortnames);
  var query = {};
  var response = {
    status: 'success'
  };
  var items = new Array();
  var url = 'http://localhost:27017/accounts';
  myMongo.connect(url, function(err, db) {
    if (err) return next(err);
    var userdb = db.collection('items');
    var queryResult = new Array();
    async.series( [ 
      function(callback) {
        if(namesToFind) {
        
          userdb.find( { "shortname": { $in: namesToFind } } ).toArray( function(err, dbresult) { 
            if(err) return next(err);
            queryResult = dbresult;
            callback();
          });
        } else {
          userdb.find( ).toArray( function( err, dbresult) {
            if(err) return next(err);
            queryResult = dbresult;
            callback();
          });
        }
      },
      function(callback) {
        if(namesToFind) {
          for(var i = 0; i < namesToFind.length; ++i) {
            items.push({});
          }
          
          for(var i= 0; i < queryResult.length; ++i) {
            var newEntry = {};
            newEntry.id = queryResult[i]._id;
            newEntry.shortname = queryResult[i].shortname;
            newEntry.description = queryResult[i].description;
            newEntry.isStackable = queryResult[i].isStackable;
            newEntry.attributes = queryResult[i].attributes;
            if(queryResult[i].name) {
              newEntry.name = queryResult[i].name;
            } else {
              newEntry.name = queryResult[i].shortname;
            }
            for(var j = 0; j < namesToFind.length; ++j) {
              if(namesToFind[j] == newEntry.shortname) {
                items[j] = newEntry;
              }
            }
          }
        } else {
          for(var i= 0; i < queryResult.length; ++i) {
            var newEntry = {};
            newEntry.id = queryResult[i]._id;
            newEntry.shortname = queryResult[i].shortname;
            newEntry.description = queryResult[i].description;
            newEntry.isStackable = queryResult[i].isStackable;
            newEntry.attributes = queryResult[i].attributes;
            if(queryResult[i].name) {
              newEntry.name = queryResult[i].name;
            } else {
              newEntry.name = queryResult[i].shortname;
            }
            items.push(newEntry);

          }
        }
        response.items = items;
        return res.send(JSON.stringify(response));
      }
    ]);
  });

}

function listItems(req, res) {
  var response = {
    status: 'success'
  };
  var url = 'http://localhost:27017/accounts';
  var items = new Array();
  myMongo.connect(url, function(err, db) {
    if (err) return next(err);
    var itemdb = db.collection('items');
    itemdb.find().toArray( function(err, dbresult) { 
      if(err) return next(err);
      var newEntry = {};
      for(var i= 0; i < dbresult.length; ++i) {
        newEntry.id = dbresult[i]._id;
        newEntry.shortname = dbresult[i].shortname;
        newEntry.description = dbresult[i].description;
        newEntry.isStackable = dbresult[i].isStackable;
        newEntry.attributes = dbresult[i].attributes;
        if(dbresult[i].name) {
          newEntry.name = dbresult[i].name;
        } else {
          newEntry.name = dbresult[i].shortname;
        }
        items.push(newEntry);
      }
      response.items = items;
      return res.send(JSON.stringify(response));
    });
  });
}


module.exports.register = function(app, root) {
  app.get(root + 'create', makeItem);
  app.post(root + 'create', makeItem);
  app.get(root + ':id/get', getItem);
  app.post(root + ':id/get', getItem);
  app.get(root + ':id/update', updateItem);
  app.post(root + ':id/update', updateItem);
  app.get(root + 'find', findItem);
  app.post(root + 'find', findItem);
  app.get(root + 'list', listItems);
  app.post(root + 'list', listItems);
}


