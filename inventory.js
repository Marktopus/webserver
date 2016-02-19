var mongo = require('mongodb');
var myMongo = require('./db.js');

//we only have update in this path because the spec is weird.

function updateInventory(req, res) {
  var id = req.params.id;
  if(id.charAt(0) === ':') {
    id = id.substr(1);
  }
  var targetID = "";
  var quantity = (req.body.quantity || req.query.quantity);
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
              inventorydb.findOne({_id:searchTargetID}, function(err, inventoryEntry) {
                if(err) return next(err);
                if(inventoryEntry) {
                  if(me.isAdmin) {
                    var itemSearchID = new mongo.ObjectID(inventoryEntry.itemid);
                    itemdb.findOne({_id: itemSearchID}, function(err, itemEntry) {
                      if(err) return next(err);
                      if(itemEntry) {
                        if(itemEntry.isStackable) {
                          if(quantity >= 0) {
                            //set the quantity to quantity
                            inventorydb.update({_id:searchTargetID}, {$set: {quantity: quantity}});
                            data.id = _id;
                            data.quantity = quantity;
                            response.data = data;
                            return res.send(JSON.stringify(response));
                          } else {
                            response.status = 'fail';
                            data.quantity = 'Invalid';
                            response.data = data;
                            return res.send(JSON.stringify(response));
                          }
                        } else {
                          if(quantity == 1 || quantity == 0) {
                            inventorydb.update({_id:searchTargetID}, {$set: {quantity: quantity}});
                            data.id = _id;
                            data.quantity = quantity;
                            response.data = data;
                            return res.send(JSON.stringify(response));
                          } else {
                            response.status = 'fail';
                            data.quantity = 'Invalid';
                            response.data = data;
                            return res.send(JSON.stringify(response));
                            //quantity invalid
                          }
                        }
                      } else {
                        response.status = 'fail';
                        data.entry = 'Invalid';
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
                  resposne.reason = data;
                  return res.send(JSON.stringify(response));
                }
              });
            } else {
              response.status = 'fail';
              data.session = 'Invalid';
              response.reason = data;
              return res.send(JSON.stringify(response));
            }
          });
        });
      } else {
        response.status = 'fail';
        data.session = 'Not authorized';
        response.reason = data;
        return res.send(JSON.stringify(response));
      }
    });
  } else {
    response.status = 'fail';
    data.session = 'Invalid';
    response.reason = data;
    return res.send(JSON.stringify(response));
  }


}

module.exports.register = function(app, root) {
  app.post(root + ':id', updateInventory);


}
