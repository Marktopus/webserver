var mongo = require ('./db.js');

var realmongo = require('mongodb');

var mongoClient = realmongo.MongoClient;
var redis = require('redis');
var crypto = require('crypto');
var redisClient = redis.createClient();


function findUser(req, res) {
  
  var session = (req.body._session || req.query._session);
  var token = (req.body._token || req.query._token);
  var response = {
    status: 'success'
  };
  var data = {
  };

  var username = req.params.username;
  if(username.charAt(0) === ':') {
    username = username.substr(1);
  }
  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if(session)
  {
    redisClient.hgetall(session, function(err, result) {
      if(err) return next(err);
      if(result && (result.authtoken == token)) {
        var url = 'http://localhost:27017/accounts';
        mongo.connect(url, function(err, db) {
          if (err) return next(err);
          var userdb = db.collection('users');
          userdb.findOne( {username: username}, function(err, result) { 
            if(err) return next(err);
            if(result !== null) {
              data.id = result._id;
              data.username = result.username;
              response.data = data;
            } else {
              data.username = 'Not found';
              response.status = 'fail';
              response.reason = data;
            }
            res.send(JSON.stringify(response));
          });
        });
      } else {
        data.session = 'invalid';
        response.reason = data;
        response.status = 'fail';
        res.send(JSON.stringify(response));
      }
    });
  } else { 
    data.session = 'invalid';
    response.reason = data;
    response.status = 'fail';
    res.send(JSON.stringify(response));
  }
}

function getUser(req, res) {
  var id = req.params.id;
  if(id.charAt(0) === ':') {
    id = id.substr(1);
  }

  var session = (req.body._session || req.query._session);
  var token = (req.body._token || req.query._token);
  var targetID = id;
  searchTargetID = new realmongo.ObjectID(id);
  
  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if(session)
  {
    redisClient.hgetall(session, function(err, result) {
      if(err) return next(err);
      if(result && (result.authtoken == token)) {
        var response = {
          status: 'success'
        };
        var data = {
        };
        var url = 'http://localhost:27017/accounts';
        mongo.connect(url, function(err, db) {
          if (err) return next(err);
          var userdb = db.collection('users');
          userdb.findOne( {_id: searchTargetID}, function(err, dbresult) { 
            if(err) return next(err);
            if(dbresult) {
              data.id = id;
              data.username = dbresult.username;
              data.avatar = dbresult.avatar;
              response.data = data;
            } else {
              data.id = 'Not found';
              response.status = 'fail';
              response.reason = data;
            }
            return res.send(JSON.stringify(response));
          });
        });
      } else {
        //bad session
        data.session = 'invalid';
        response.status = 'fail';
        response.reason = data;
        return res.send(JSON.stringify(response));
      }
    });
  } else { 
    data.session = 'invalid';
    response.reason = data;
    response.status = 'fail';
    res.send(JSON.stringify(response));
  }
}

function updateUser(req, res) {
  var id = req.params.id;
  if(id.charAt(0) === ':') {
    id = id.substr(1);
  }

  var targetID = "";
  var oldPassword = (req.body.oldPassword || req.query.oldPassword);
  var newPassword = (req.body.newPassword || req.query.newPassword);
  var isAdmin = (req.body.isAdmin || req.query.isAdmin);
  var avatar = (req.body.avatar || req.query.avatar);
  
  var session = (req.body._session || req.query._session);
  var token = (req.body._token || req.query._token);
  var targetID = id;
  var searchTargetID = new realmongo.ObjectID(id);
  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  var response = {
    status: 'success'
  };
  var data = {
  };
  
  //since the whole thing require authentication
  if(session) {
    redisClient.hgetall(session, function(err, result) {
      if(err) return next(err);
      if(result && (result.authtoken == token)) {
        var authtoken = result.authtoken;
        var currentUserName = result.username;
        var url = 'http://localhost:27017/accounts';
        mongo.connect(url, function(err, db) {
          if (err) return next(err);
          var userdb = db.collection('users');
          userdb.find({$or:[{_id: searchTargetID}, {username:currentUserName}]}).toArray(function(err, foundUsers) { 
            if(err) return res.send(err);
            var target = null;
            var me = null;
            if(foundUsers.length > 1) {
              if(targetID == foundUsers[0]._id) {
                target = foundUsers[0];
                me = foundUsers[1];
              } else {
                target = foundUsers[1];
                me = foundUsers[0];
              }
            } else if (foundUsers.length == 1) {
              target = foundUsers[0];
              me = target;
            }
            if(result) {
              if(me.isAdmin || (me == target)) { 
                if(isAdmin) {
                  if(me.isAdmin) {
                    data.isAdmin = isAdmin;
                  } else {
                    response.status = 'fail';
                    data.isAdmin = 'Forbidden';
                    response.reason = data;
                    return res.send(JSON.stringify(response));
                  }
                }
                if(newPassword) {
                  if((oldPassword == me.password) || me.isAdmin) {
                    data.passwordChanged = true;
                  } else {
                    response.status = 'fail';
                    data.oldPassword = 'Forbidden';
                    response.reason = data;
                    return res.send(JSON.stringify(response));
                  }
                }
                if(avatar) {
                  data.avatar = avatar;
                }
                response.data = data;
              } else {
                response.status = 'fail';
                data.id = 'Forbidden';
                response.reason = data;
                return res.send(JSON.stringify(response));
              }
              if(data.isAdmin) {
                userdb.update( {_id: searchTargetID}, { $set: { isAdmin: isAdmin} });
              }
              if(data.avatar) {
                userdb.update( {_id: searchTargetID}, { $set: { avatar: avatar } });
              }
              if(data.passwordChanged) { 
                userdb.update( {_id: searchTargetID}, { $set: { password: newPassword } });
              }
              return res.send(JSON.stringify(response));
            } else {
              data.id = 'Not found';
              response.status = 'fail';
              response.reason = data;
              return res.send(JSON.stringify(response));
            }
          });
        });
      } else {
        response.status = 'fail';
        data.user = 'notAuthorized';
        response.reason = data;
        return res.send(JSON.stringify(response));
      }
    });
  } else { 
    data.session = 'invalid';
    response.reason = data;
    response.status = 'fail';
    res.send(JSON.stringify(response));
  }
}

function loginUser(req, res) {
  var username = (req.body.username || req.query.username); 
  var password = (req.body.pasword || req.query.password);
  //start pass thing
  var response = {
    status: 'success'
  };
  var data = {
  };
  var url = 'http://localhost:27017/accounts';
  mongo.connect(url, function(err, db) {
    if(err) { 
      return next(err); 
    } 
    var userdb = db.collection('users');
    userdb.findOne( {username: username}, function (err, result) {
      if(err) return next(err);  
      if(result) {
        if(password !== result.password) {
          response.status = 'fail';
          response.reason = 'Username/password mismatch';
          res.send(JSON.stringify(response));
        } else {//login success!
          data.id = result._id;
          data.username = username;
          crypto.randomBytes(40, function(err, buf) {
            var hex = buf.toString('hex');
            data.session = hex.substr(0, 40);
            data.token = hex.substr(40);
            
            redisClient.hmset(data.session, "authtoken", data.token, "username", username, function(err, reply) {
              if(err) return next(err);
              response.data = data;
              res.send(JSON.stringify(response));
            });
          });
        }
      } else {
        response.reason = 'Username/password mismatch';
        response.status = 'fail';
        res.send(JSON.stringify(response));
      }
    });
  });
}

function makeUser(req, res) {
  var username = (req.body.username || req.query.username); 
  var password = (req.body.password || req.query.password);
  var avatar =   (req.body.avatar || req.query.avatar);
  //start pass thing
  var response = {
    status: 'success'
  };
  var data = {
    username: username,
  };
  
  var url = 'http://localhost:27017/accounts';
  mongo.connect(url, function(err, db) {
    if(err) { 
      return next(err); 
    } 
    var userdb = db.collection('users');
    userdb.findOne( {"username": username}, function (err, result) {
      if(err) return next(err);  
      if(!result) {
        //create the user
        userdb.insertOne({ username: username, password: password, avatar: avatar }, function(err, result) {
          if(err) { 
            return next(err);
          }
          data.username = result.ops[0].username;
          data.id = result.ops[0]._id;
          response.data = data;
          res.send(JSON.stringify(response));
        });
      } else {
        data.username = 'Already taken';
        response.reason = data;
        response.status = 'fail';
        res.send(JSON.stringify(response));
      }
    });
  });
}

function listInventory(req, res) {
  var id = req.params.userid;
  if(id.charAt(0) === ':') {
    id = id.substr(1);
  }
  var targetID = "";
  
  var session = (req.body._session || req.query._session);
  var token = (req.body._token || req.query._token);
  var targetID = id;
  searchTargetID = new realmongo.ObjectID(id);
  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  var response = {
    status: 'success'
  };
  var data = {
  };
  
  
  //since the whole thing require authentication
  if(session) {
    redisClient.hgetall(session, function(err, result) {
      if(err) return next(err);
      if(result && (result.authtoken == token)) {
        var url = 'http://localhost:27017/accounts';
        mongo.connect(url, function(err, db) {
          if(err) { 
            return next(err); 
          } 
          var userdb = db.collection('users');
          var itemdb = db.collection('items');
          var inventorydb = db.collection('inventory');
          userdb.findOne({username:session.username}, function(err, me) { 
            if(err) return res.send(err);
            if(me) {
              userdb.findOne({_id:searchTargetID}, function(err, result) {
                if(err) return next(err);
                if(result) {
                  if(me.isAdmin || (result == me)) {
                    inventorydb.find({userid: id}).toArray( function(err, result) {
                      if(err) return next(err);
                      if(result) {
                        data.inventory = result;
                        response.data = data;
                        return res.send(JSON.stringify(response));
                      } else {
                        response.status = 'fail';
                        data.userid = 'invalid';
                        response.reason = data;
                        return res.send(JSON.stringify(response));
                      }
                    });
                  } else {
                    response.status = 'fail';
                    data.id = 'Forbidden';
                    response.reason = data;
                    return res.send(JSON.stringify(response));
                  }
                } else {
                  response.status = 'fail';
                  data.id = 'Not found';
                  response.reason = data;
                  return res.send(JSON.stringify(response));
                }
              });
            } else {
              response.status = 'fail';
              data.session = 'invalid';
              response.reason = data;
              return res.send(JSON.stringify(response));
            }
          });
        });
      } else {
        response.status = 'fail';
        data.session = 'invalid';
        response.reason = data;
        return res.send(JSON.stringify(response));
      }
    });
  } else {
    response.status = 'fail';
    data.session = 'invalid';
    response.reson = data;
    return res.send(JSON.stringify(response));
  }
}

function createInventory(req, res) {
  var id = req.params.userid;
  if(id.charAt(0) === ':') {
    id = id.substr(1);
  }
  var targetID = "";
  
  var itemsToFind = (req.body.items || req.query.items);

  var session = (req.body._session || req.query._session);
  var token = (req.body._token || req.query._token);
  var targetID = id;
  var searchTargetID = new realmongo.ObjectID(targetID);

  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  var response = {
    status: 'success'
  };
  var data = {
  };
  
  //new
  if(session) {
    redisClient.hgetall(session, function(err, result) {
      if(err) return next(err);
      if(result && (result.authtoken == token)) {
        var url = 'http://localhost:27017/accounts';
        mongo.connect(url, function(err, db) {
          if(err) return next(err);
          var userdb = db.collection('users');
          var itemdb = db.collection('items');
          var inventorydb = db.collection('inventory');
          userdb.findOne({username:session.username}, function(err, result) {
            if(err) return next(err);
            if(result) {
              if(result.isAdmin) {
                // the following two arrays represent the order
                var viaID = new Array();
                var viaShortname = new Array();
                for(int i = 0; i < itemsToFind.length; ++i) {
                  viaID.push(new realmongo.ObjectID(itemsToFind[i].itemid));
                  viaShortname.push(itemsToFind[i].shortname);
                }
                var foundViaID = new Array();
                var foundViaShortname = new Array();
                var foundItems = new Array();
                var inventoryQuery = new Array();
                async.series([
                  function(done) {//query for ids
                    itemdb.find({_id: {$in : viaID}).toArray( function(err, foundItems) {
                      if(err) return next(err);
                      for(var i = 0; i < foundItems.length; ++i) {
                        foundViaID.push(foundItems[i];
                      }
                      done();
                    });
                  },
                  function(done) {//query for shortnames
                    itemdb.find({shortname: {$in: viaShortname}}).toArray( function(err, foundItems) {
                      if(err) return next(err);
                      for(var i = 0; i < foundItems.length; ++i) {
                        foundViaShortname.push(foundItems[i]);
                      }
                      done();
                    });
                  },
                  function(done) {//more logic
                    //check if the things we found 
                    for(var i = 0; i < viaID.length; ++i) {
                    //loop through via id and via shortname
                    //find counterparts in found items
                    //if they're the same item but dont match kill everything
                      var shortItem;
                      var idItem;
                      for(var i = 0; i < foundViaID.length; ++i) {
                        if(foundViaID._id == viaID[i]) {
                          idItem = foundViaID;
                          break;
                        }
                      }
                      for(var i = 0; i < foundViaShortname.length; ++i) {
                        if(foundViaShortname[i].shortname == viaShortname[i]) {
                          shortItem = foundViaShortname[i];
                          break;
                        }
                      }

                      if(viaID[i] && viaShortname[i]) {
                        if(idItem !== shortItem) { // blow up
                          response.status = 'fail';
                          response.reason = 'different identifiers id disparate items';
                          return res.send(response);
                        } else {
                          foundItems.push(idItem);
                        }
                      } else if(idItem) {
                        foundItems.push(idItem);
                      } else {
                        foundItems.push(shortItem);
                      }
                    }

                  },
                  function(done) {
                  
                  }
                ]);
              }
            }
          });
        });
      });
    });
  }


  
  //since the whole thing require authentication
  if(session) {
    redisClient.hgetall(session, function(err, result) {
      if(err) return next(err);
      if(result && (result.authtoken == token)) {
        var url = 'http://localhost:27017/accounts';
        mongo.connect(url, function(err, db) {
          if(err) { 
            return next(err); 
          }
          var userdb = db.collection('users');
          var itemdb = db.collection('items');
          var inventorydb = db.collection('inventory');
          userdb.findOne({username:session.username}, function(err, result) { 
            if(err) return next(err);
            if(result) {
              if(result.isAdmin) {
                var queryArray = new Array();
                return res.send(itemsToFind);
                for(var i = 0; i < itemsToFind.length; ++i) {
                  var insertdata = {
                  };
                  if(itemsToFind[i].shortname) {
                    insertdata.shortname = itemsToFind[i].shortname;
                  }
                  if(itemsToFind[i].itemid) {
                    insertdata.itemid = new realmongo.ObjectID(itemsToFind[i].itemid);
                  }
                  queryArray.push(insertdata);
                }
                itemdb.find({$or:queryArray}).toArray( function(err, itemArray) {
                  if(err) return next(err);
                  return res.send(JSON.stringify(queryArray));
                  for(var i = 0; i < itemArray.length; ++i) {
                    for(var j = 0; j < queryArray.length; ++j) {
                      if(itemArray[i].shortname == queryArray[j].shortname || itemArray[i]._id == queryArray[j]._id){
                        queryArray[j].itemRef = itemArray[i];
                      }
                    }
                  }
                  for(var i = 0; i < queryArray.length; ++i) {
                    if(!queryArray[i].itemRef) {
                      response.status = 'fail';
                      response.reason = {'items[index]': 'No ID'};
                      return res.send(JSON.stringify(response));
                    }
                    if(queryArray[i].shortname && queryArray[i]._id) {
                      if(queryArray[i].shortname !== queryArray[i].itemRef.shortname) {
                        response.status = 'fail';
                        response.reason = {'items[index]': 'Invalid quantity'};
                        return res.send(JSON.stringify(response));
                      }
                      if(queryArray[i]._id !== queryArray[i].itemRef._id) {
                        response.status = 'fail';
                        response.reason = {'items[index]': 'Invalid quantity'};
                        return res.send(JSON.stringify(response));
                      }
                    }
                  }
                  for(var i = 0; i < queryArray.length; ++i) {
                    for(var j = 0; j < itemsToFind.length; ++j) {
                      if(i !== j) {
                        if(queryArray[i].shortname == itemsToFind[j].shortname || queryArray[i]._id == itemsToFind[j].id) {
                          if(queryArray[i].itemRef.isStackable) {
                            queryArray[i].quantity += itemsToFind[j].quantity;
                          } else {
                            queryArray[i].quantity = itemsToFind[j].quantity;
                          }
                        }
                      }
                    }
                  }
                  for(var i = 0; i < queryArray.length; ++i) {
                    if(queryArray[i].itemRef.isStackable) {
                      if(queryArray[i].quantity <= 0) {
                        response.status = 'fail';
                        response.reason = {'items[index]': 'Invalid quantity'};
                        return res.send(JSON.stringify(response));
                      }
                    } else {
                      if(queryArray[i].quantity && queryArray[i].quantity !== 1) {
                        response.status = 'fail';
                        response.reason = {'items[index]': 'Invalid quantity'};
                        return res.send(JSON.stringify(response));
                      }
                    }
                  }
                  var databaseEntry = new Array();
                  var returnArray = new Array();
                  for(var i = 0; i < queryArray.length; ++i) {
                    var toinsert = {userid: id, itemid:queryArray[i].itemRef._id, shortname:queryArray[i].shortname, quantity:queryArray[i].quantity};
                    if(queryArray[i].itemRef.isStackable) {
                      var exists = false;
                      for(var j = 0; j < databaseEntry.length; ++j) {
                        if(databaseEntry[j] === toinsert) {
                          exists = true;
                          break;
                        }
                      }
                      if(!exists) {
                        databaseEntry.push(toinsert);
                      }
                    } else {
                      databaseEntry.push(toinsert);
                    }
                  }
                  inventorydb.insert(databaseEntry, function(err, insertedArray) {
                    if(err) return next(err);
                    for(var i = 0; i < queryArray.length; ++i) {
                      for(var j = 0; j < insertedArray.length; ++j) {
                        if(queryArray[i].shortname == insertedArray[i].ops[0].shortname || queryArray[i]._id == insertedArray[i].ops[0].itemid) {
                          queryArray[i].inventoryid = insertedArray[i].ops[0]._id; 
                        }
                      }
                    }
                    for(var i = 0; i < queryArray.length; ++i) {
                      returnArray.push({id: queryArray[i].inventoryid, itemid: queryArray[i].itemRef._id, shortname: queryArray[i].shortname, quantity: queryArray[i].quantity});
                    }
                    data.inventory = returnArray;
                    response.data = data;
                    return res.send(JSON.stringify(response));
                  });
                });
              } else {
                response.status = 'fail';
                response.reason = 'Forbidden';
                return res.send(JSON.stringify(response));
              }
            } else {
              response.status = 'fail';
              response.reason = {id: 'invalid'};
              return res.send(JSON.stringify(response));
            }
          });
        }); 
      } else {
        response.status = 'fail';
        response.reason = 'Not Authenticated';
        return res.send(JSON.stringify(response));
      }
    });
  } else {
    response.status = 'fail';
    response.reason = 'Not Authenticated';
    return res.send(JSON.stringify(response));
  }
}

module.exports.register = function(app, root) {
  app.post(root + 'create', makeUser);
  app.get(root + ':id/get', getUser);
  app.post(root + ':id/get', getUser);
  app.post(root + ':id/update', updateUser);
  app.get(root + 'find/:username', findUser);
  app.post(root + 'find/:username', findUser);
  app.get(root + 'login', loginUser);
  app.post(root + 'login', loginUser);
  app.get(root + ':userid/inventory/list', listInventory);
  app.post(root + ':userid/inventory/list', listInventory);

  app.post(root + ':userid/inventory/create', createInventory);
}
