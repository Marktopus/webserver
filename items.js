var mongo = require('mongodb');
var myMongo = require('./db.js');
var mongoClient = mongo.MongoClient;
var redis = require('redis');
var crypto = require('crypto');
var redisClient = redis.createClient();

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
  var response = {
    status: 'success'
  };
  var url = 'http://localhost:27017/accounts';
  myMongo.connect(url, function(err, db) {
    if (err) return next(err);
    var userdb = db.collection('items');
    userdb.find( { $or: namesToFind } ).toArray( function(err, dbresult) { 
      if(err) return next(err);
      if(dbresult) {
        response.items = dbresult;
      }
      return res.send(JSON.stringify(response));
    });
  });

}

function listItems(req, res) {
  var response = {
    status: 'success'
  };
  var url = 'http://localhost:27017/accounts';
  myMongo.connect(url, function(err, db) {
    if (err) return next(err);
    var itemdb = db.collection('items');
    itemdb.find().toArray( function(err, dbresult) { 
      if(err) return next(err);
      response.items = dbresult;//can i just do this
      return res.send(JSON.stringify(response));
    });
  });
}


module.exports.register = function(app, root) {
  app.get(root + 'create', makeItem);
  app.get(root + ':id/get', getItem);
  app.get(root + ':id/update', updateItem);
  app.get(root + 'find', findItem);
  app.get(root + 'list', listItems);
}


