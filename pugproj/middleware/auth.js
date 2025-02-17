function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error', 'Please log in to view this resource');
    res.redirect('/login');
}

module.exports = {
    ensureAuthenticated
};