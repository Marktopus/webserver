module.exports = function(options) {
  return function(req, res, next) {
    res.contentType('application/json');
    next();
  }
}
