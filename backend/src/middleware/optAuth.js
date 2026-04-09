const jwt = require('jsonwebtoken');

// Optional auth - attaches user if token present, but doesn't block if missing
module.exports = (req, res, next) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    } catch {}
  }
  next();
};
