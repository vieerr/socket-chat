module.exports = function requireAuth(req, res, next) {
  const username = req.cookies.username?.trim();
  if (username) {
    next();
  } else {
    res.redirect("/register");
  }
};
