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

//? Connect to MongoDB
async function connectToMongo() {
    try {
        await client.connect();
        console.log('Successfully connected to MongoDB Atlas');
        
        const db = client.db(dbName);
        
        //? Test collection 
        const testCollection = db.collection('test_collection');
        await testCollection.insertOne({
            message: "Test connection",
            timestamp: new Date(),
            status: "active"
        });
        
        console.log('Test document inserted successfully');
        
        //? Connection check
        const collections = await db.listCollections().toArray();
        console.log('Available collections:', collections.map(c => c.name));
        
        return db;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}

//? Connect to MongoDB
let db;
connectToMongo()
    .then((database) => {
        db = database;
    })
    .catch(console.error);

//? Shutdown
process.on('SIGINT', async () => {
    await client.close();
    process.exit();
});

//? Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(flash());

//? View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

//? Session config
app.use(session({
    secret: 'H7d#k9L$mP2vR8nX@qW5sY4tA1zC6bE3',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

//? Passport init
app.use(passport.initialize());
app.use(passport.session());

//? flash messages to all routes
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});

//? Routes
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
        
        //? User already exists check
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            req.flash('error', 'Email already registered');
            return res.redirect('/register');
        }

        //? Create new user
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

//? Protected routes
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

//? Cursor Routes

//? Stream items with cursor
app.get('/api/items/stream', async (req, res) => {
    try {
        const { batchSize = 100, filter = {} } = req.query;
        
        //? Parse filter if it's a string
        const parsedFilter = typeof filter === 'string' ? JSON.parse(filter) : filter;
        
        const cursor = db.collection('items').find(parsedFilter).batchSize(parseInt(batchSize));
        
        res.setHeader('Content-Type', 'application/json');
        res.write('[');
        
        let isFirst = true;
        
        //? Process documents one at a time
        await cursor.forEach(doc => {
            if (!isFirst) {
                res.write(',');
            }
            isFirst = false;
            res.write(JSON.stringify(doc));
        });
        
        res.write(']');
        res.end();
        
    } catch (error) {
        console.error('Error streaming documents:', error);
        res.status(500).json({ error: 'Error streaming documents' });
    }
});

//? Paginated items with cursor
app.get('/api/items/paginated', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const cursor = db.collection('items')
            .find({})
            .skip(skip)
            .limit(limit);
        
        const [items, total] = await Promise.all([
            cursor.toArray(),
            db.collection('items').countDocuments()
        ]);
        
        res.json({
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Error fetching paginated documents:', error);
        res.status(500).json({ error: 'Error fetching paginated documents' });
    }
});

//? Cursor with sorting and filtering
app.get('/api/items/advanced', async (req, res) => {
    try {
        const { 
            sort = '{}',
            filter = '{}',
            fields = '',
            limit = '50'
        } = req.query;
        
        //? Parse query parameters
        const sortObj = JSON.parse(sort);
        const filterObj = JSON.parse(filter);
        const projection = fields ? 
            Object.fromEntries(fields.split(',').map(field => [field, 1])) : 
            {};
        
        const cursor = db.collection('items')
            .find(filterObj)
            .project(projection)
            .sort(sortObj)
            .limit(parseInt(limit));
        
        const items = await cursor.toArray();
        res.json(items);
        
    } catch (error) {
        console.error('Error in advanced query:', error);
        res.status(500).json({ error: 'Error in advanced query' });
    }
});

//? Aggregation Routes

//? Basic statistics
app.get('/api/items/stats', async (req, res) => {
    try {
        const stats = await db.collection('items').aggregate([
            {
                $group: {
                    _id: null,
                    totalCount: { $sum: 1 },
                    avgPrice: { $avg: '$price' },
                    minPrice: { $min: '$price' },
                    maxPrice: { $max: '$price' },
                    categories: { $addToSet: '$category' }
                }
            }
        ]).toArray();
        
        res.json(stats[0] || {});
        
    } catch (error) {
        console.error('Error calculating statistics:', error);
        res.status(500).json({ error: 'Error calculating statistics' });
    }
});

//? Category-based aggregation
app.get('/api/items/category-stats', async (req, res) => {
    try {
        const categoryStats = await db.collection('items').aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    avgPrice: { $avg: '$price' },
                    totalRevenue: { $sum: { $multiply: ['$price', '$quantity'] } },
                    items: { $push: { name: '$name', price: '$price' } }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]).toArray();
        
        res.json(categoryStats);
        
    } catch (error) {
        console.error('Error calculating category statistics:', error);
        res.status(500).json({ error: 'Error calculating category statistics' });
    }
});

//? Time-based analytics
app.get('/api/items/time-stats', async (req, res) => {
    try {
        const { period = 'daily' } = req.query;
        
        let dateFormat;
        switch(period) {
            case 'hourly':
                dateFormat = {
                    $dateToString: {
                        format: '%Y-%m-%d %H:00',
                        date: '$createdAt'
                    }
                };
                break;
            case 'daily':
                dateFormat = {
                    $dateToString: {
                        format: '%Y-%m-%d',
                        date: '$createdAt'
                    }
                };
                break;
            case 'monthly':
                dateFormat = {
                    $dateToString: {
                        format: '%Y-%m',
                        date: '$createdAt'
                    }
                };
                break;
            default:
                return res.status(400).json({ error: 'Invalid period. Use hourly, daily, or monthly.' });
        }
        
        const timeStats = await db.collection('items').aggregate([
            {
                $match: {
                    createdAt: { $exists: true }
                }
            },
            {
                $group: {
                    _id: dateFormat,
                    count: { $sum: 1 },
                    totalRevenue: { $sum: { $multiply: ['$price', '$quantity'] } },
                    avgPrice: { $avg: '$price' }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]).toArray();
        
        res.json(timeStats);
        
    } catch (error) {
        console.error('Error calculating time-based statistics:', error);
        res.status(500).json({ error: 'Error calculating time-based statistics' });
    }
});

//? Complex aggregation with multiple stages
app.get('/api/items/advanced-stats', async (req, res) => {
    try {
        const { minPrice = 0, maxPrice = Number.MAX_VALUE } = req.query;
        
        const advancedStats = await db.collection('items').aggregate([
            //? 1: Match items within price range
            {
                $match: {
                    price: {
                        $gte: parseFloat(minPrice),
                        $lte: parseFloat(maxPrice)
                    }
                }
            },
            //? 2: Group by category
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    totalRevenue: { $sum: { $multiply: ['$price', '$quantity'] } },
                    avgPrice: { $avg: '$price' },
                    items: { $push: '$$ROOT' }
                }
            },
            //? 3: Add category ranking based on revenue
            {
                $setWindowFields: {
                    sortBy: { totalRevenue: -1 },
                    output: {
                        revenueRank: {
                            $rank: {}
                        }
                    }
                }
            },
            //? 4: Project final format
            {
                $project: {
                    category: '$_id',
                    _id: 0,
                    count: 1,
                    totalRevenue: 1,
                    avgPrice: 1,
                    revenueRank: 1,
                    topItems: {
                        $slice: [
                            {
                                $sortArray: {
                                    input: '$items',
                                    sortBy: { price: -1 }
                                }
                            },
                            3
                        ]
                    }
                }
            },
            //? 5: Sort by revenue rank
            {
                $sort: { revenueRank: 1 }
            }
        ]).toArray();
        
        res.json(advancedStats);
        
    } catch (error) {
        console.error('Error calculating advanced statistics:', error);
        res.status(500).json({ error: 'Error calculating advanced statistics' });
    }
});

//? Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});