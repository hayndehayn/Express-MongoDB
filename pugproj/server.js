const express = require("express");
const path = require("path");
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { authMiddleware, JWT_SECRET } = require('./middleware/auth');

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// View engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
app.engine('pug', require('pug').__express);
app.engine('ejs', require('ejs').__express);

// Static files
app.use(express.static("public"));

// Mock database
const users = [
    { id: 1, name: "John Smith", email: "john@example.com", password: '$2a$10$XbzWykIwNqYLF8LZk6H3p.xqB1P7E0RxqNO5G3ZOC8Z9ZK3nFH3Hy' }, // password: "password123"
    { id: 2, name: "Jane Doe", email: "jane@example.com", password: '$2a$10$XbzWykIwNqYLF8LZk6H3p.xqB1P7E0RxqNO5G3ZOC8Z9ZK3nFH3Hy' },
    { id: 3, name: "Robert Johnson", email: "robert@example.com", password: '$2a$10$XbzWykIwNqYLF8LZk6H3p.xqB1P7E0RxqNO5G3ZOC8Z9ZK3nFH3Hy' },
];

// Auth routes
app.get('/login', (req, res) => {
    res.render('auth/login');
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.render('auth/login', { error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    res.cookie('jwt', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }); // 24 hours
    res.redirect('/users');
});

app.get('/register', (req, res) => {
    res.render('auth/register');
});

app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    
    if (users.some(u => u.email === email)) {
        return res.render('auth/register', { error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: users.length + 1,
        name,
        email,
        password: hashedPassword
    };
    users.push(newUser);

    const token = jwt.sign({ id: newUser.id, name: newUser.name, email: newUser.email }, JWT_SECRET, { expiresIn: '24h' });
    res.cookie('jwt', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }); // 24 hours
    res.redirect('/users');
});

app.get('/logout', (req, res) => {
    res.clearCookie('jwt');
    res.redirect('/login');
});

// Theme route
app.post('/theme', (req, res) => {
    const { theme } = req.body;
    res.cookie('theme', theme, { maxAge: 365 * 24 * 60 * 60 * 1000 }); // 1 year
    res.json({ success: true });
});

// Protected routes
app.get("/", (req, res) => {
    res.redirect("/users");
});

app.get("/users", authMiddleware, (req, res) => {
    res.render("users/index", { 
        users,
        user: req.user,
        theme: req.cookies.theme || 'light'
    });
});

app.get("/users/:userId", authMiddleware, (req, res) => {
    const userId = parseInt(req.params.userId);
    const user = users.find(u => u.id === userId);
    
    if (!user) {
        return res.status(404).send('User not found');
    }
    
    res.render("users/details", { 
        user,
        currentUser: req.user,
        theme: req.cookies.theme || 'light'
    });
});

// EJS routes
app.get("/articles", authMiddleware, (req, res) => {
    const articles = [
        { id: 1, title: "What is Node.js?", content: "Node.js is..." },
        { id: 2, title: "Using Express", content: "Express is..." },
        {
            id: 3,
            title: "PUG and EJS Templating Engines",
            content: "PUG and EJS are...",
        },
    ];
    res.render("articles/index", { 
        articles,
        user: req.user,
        theme: req.cookies.theme || 'light'
    });
});

app.get("/articles/:articleId", authMiddleware, (req, res) => {
    const articleId = parseInt(req.params.articleId);
    const article = {
        id: articleId,
        title: "What is Node.js?",
        content: "Node.js is...",
    };
    res.render("articles/details", { 
        article,
        user: req.user,
        theme: req.cookies.theme || 'light'
    });
});

app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
});