function getMotd(req, res) {
  var response = {
    status: 'success',
    data: {
      lastModified: new Date().toISOString(),
      motd: 'The features implemented this milestone are as follows: Accounts, Inventory, SSL Authentication (attempted)'
    }
  }

  res.send(JSON.stringify(response));
}

module.exports.register = function(app, name) {
  app.get(name + 'get', getMotd);
  app.post(name + 'get', getMotd);
}
