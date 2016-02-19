var hits = 1;

function getRoot(req, res) {
  res.send('Hello you are caller number ' + hits);
  hits = hits + 1;
}

module.exports.register = function(app) {
  app.get('/', getRoot);
}
