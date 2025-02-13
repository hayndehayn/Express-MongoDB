const express = require("express");
const path = require("path");
const app = express();
const port = 3000;

// Path to views
app.set("views", path.join(__dirname, "views"));

// Engine set-up
app.set("view engine", "pug"); // Default engine
app.engine('pug', require('pug').__express);
app.engine('ejs', require('ejs').__express);

// CSS
app.use(express.static("public"));


app.get("/", (req, res) => {
    res.redirect("/users");
});

// PUG
app.get("/users", (req, res) => {
    const users = [
        { id: 1, name: "John Smith", email: "john@example.com" },
        { id: 2, name: "Jane Doe", email: "jane@example.com" },
        { id: 3, name: "Robert Johnson", email: "robert@example.com" },
    ];
    res.render("users/index", { users });
});

app.get("/users/:userId", (req, res) => {
    const userId = req.params.userId;
    const user = { id: userId, name: "John Smith", email: "john@example.com" };
    res.render("users/details", { user });
});

// EJS
app.get("/articles", (req, res) => {
    const articles = [
        { id: 1, title: "What is Node.js?", content: "Node.js is..." },
        { id: 2, title: "Using Express", content: "Express is..." },
        {
            id: 3,
            title: "PUG and EJS Templating Engines",
            content: "PUG and EJS are...",
        },
    ];
    res.render("articles/index", { articles });
});

app.get("/articles/:articleId", (req, res) => {
    const articleId = req.params.articleId;
    const article = {
        id: articleId,
        title: "What is Node.js?",
        content: "Node.js is...",
    };
    res.render("articles/details", { article });
});

// Server start
app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
});