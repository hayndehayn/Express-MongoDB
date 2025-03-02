const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('./config/passport');
const { ensureAuthenticated } = require('./middleware/auth');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const app = express();

//? Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

//? Static files
app.use(express.static(path.join(__dirname, 'public')));

//? View engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

//? MongoDB connection with Mongoose
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pugproj', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Successfully connected to MongoDB.'))
.catch((err) => console.error('Error connecting to MongoDB:', err));

//? Error handler
mongoose.connection.on('error', err => {
    console.error(`MongoDB connection error: ${err}`);
});

//? Handle MongoDB disconnection
mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

//? Handle process termination
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    process.exit(0);
});

//? Routes
app.get('/', (req, res) => {
    if (req.user) {
        return res.redirect('/protected');
    }
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    if (req.user) {
        return res.redirect('/protected');
    }
    res.render('auth/login', {
        error: req.flash('error')
    });
});

app.get('/register', (req, res) => {
    if (req.user) {
        return res.redirect('/protected');
    }
    res.render('auth/register', {
        error: req.flash('error')
    });
});

app.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        //? Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
        req.flash('error', 'Email already registered');
        return res.redirect('/register');
        }

        //? Create new user
        const user = new User({
        email,
        password
        });

        await user.save();
        req.flash('success', 'Registration successful. Please login.');
        res.redirect('/login');
    } catch (error) {
        console.error('Registration error:', error);
        req.flash('error', 'Registration failed');
        res.redirect('/register');
    }
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/protected',
    failureRedirect: '/login',
    failureFlash: true
}));

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
        console.error('Logout error:', err);
        }
        res.redirect('/login');
    });
});

app.get('/protected', ensureAuthenticated, (req, res) => {
    res.render('protected', { 
        user: req.user,
        success: req.flash('success')
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});