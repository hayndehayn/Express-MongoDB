const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

const users = [];

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        console.log('Attempting login for:', email);
        const user = users.find(u => u.email === email);
        
        if (!user) {
            console.log('User not found:', email);
            return done(null, false, { message: 'Incorrect email.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Invalid password for:', email);
            return done(null, false, { message: 'Incorrect password.' });
        }

        console.log('Successful login for:', email);
        return done(null, user);
    } catch (err) {
        console.error('Login error:', err);
        return done(err);
    }
}));

passport.serializeUser((user, done) => {
    console.log('Serializing user:', user.email);
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    console.log('Deserializing user id:', id);
    const user = users.find(u => u.id === id);
    if (!user) {
        console.log('User not found for id:', id);
        return done(new Error('User not found'));
    }
    console.log('Found user:', user.email);
    done(null, user);
});

// Export both passport and users array
module.exports = { passport, users };