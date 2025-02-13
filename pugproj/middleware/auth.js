const jwt = require('jsonwebtoken');

const JWT_SECRET = 'H7d#k9L$mP2vR8nX@qW5sY4tA1zC6bE3'; // Replace with actual skibidi key

const authMiddleware = (req, res, next) => {
    const token = req.cookies.jwt;

    if (!token) {
        return res.redirect('/login');
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.clearCookie('jwt');
        return res.redirect('/login');
    }
};

module.exports = { authMiddleware, JWT_SECRET };