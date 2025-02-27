const express = require('express');
const path = require('path');
const session = require('express-session');
const { passport, users } = require('./config/passport');
const { ensureAuthenticated } = require('./middleware/auth');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const bcrypt = require('bcryptjs');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// Connect to MongoDB
async function connectToMongo() {
    try {
        await client.connect();
        console.log('Successfully connected to MongoDB Atlas');
        
        const db = client.db(dbName);
        
        // Test collection 
        const testCollection = db.collection('test_collection');
        await testCollection.insertOne({
            message: "Test connection",
            timestamp: new Date(),
            status: "active"
        });
        
        console.log('Test document inserted successfully');
        
        // Connection check
        const collections = await db.listCollections().toArray();
        console.log('Available collections:', collections.map(c => c.name));
        
        return db;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}

// Connect to MongoDB
let db;
connectToMongo()
    .then((database) => {
        db = database;
    })
    .catch(console.error);

// Shutdown
process.on('SIGINT', async () => {
    await client.close();
    process.exit();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(flash());

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Session config
app.use(session({
    secret: 'H7d#k9L$mP2vR8nX@qW5sY4tA1zC6bE3',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false, // set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Passport init
app.use(passport.initialize());
app.use(passport.session());

// flash messages to all routes
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});

// Routes
app.get("/", (req, res) => {
    res.redirect("/login");
});

app.get("/login", (req, res) => {
    if (req.user) {
        return res.redirect('/protected');
    }
    res.render("auth/login", { 
        title: 'Login',
        error: req.flash('error'),
        success_msg: req.flash('success_msg')
    });
});

app.get("/register", (req, res) => {
    if (req.user) {
        return res.redirect('/protected');
    }
    res.render("auth/register", { 
        title: 'Register',
        error: req.flash('error')
    });
});

app.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            req.flash('error', 'Please provide both email and password');
            return res.redirect('/register');
        }

        if (password.length < 6) {
            req.flash('error', 'Password must be at least 6 characters long');
            return res.redirect('/register');
        }
        
        // Check if user already exists
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            req.flash('error', 'Email already registered');
            return res.redirect('/register');
        }

        // Create new user
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: users.length + 1,
            email,
            password: hashedPassword
        };
        users.push(newUser);

        req.flash('success_msg', 'You are now registered and can log in');
        res.redirect('/login');
    } catch (error) {
        console.error('Registration error:', error);
        req.flash('error', 'Error during registration');
        res.redirect('/register');
    }
});

app.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/protected',
        failureRedirect: '/login',
        failureFlash: true
    })(req, res, next);
});

app.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect('/login');
    });
});

// Protected routes
app.get("/protected", ensureAuthenticated, (req, res) => {
    res.render('protected', { 
        title: 'Protected Page',
        user: req.user,
        theme: req.cookies.theme || 'light'
    });
});

app.get("/users/:userId", ensureAuthenticated, (req, res) => {
    const userId = parseInt(req.params.userId);
    const userDetails = users.find(u => u.id === userId);
    
    if (!userDetails) {
        return res.status(404).send('User not found');
    }

    res.render("users/details", { 
        title: 'User Details',
        userDetails,
        user: req.user,
        theme: req.cookies.theme || 'light'
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});