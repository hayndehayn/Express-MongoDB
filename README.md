Web application built with Express.js + Passport.js including cursor operations and aggregation pipelines

## Features

- Passport.js Integration
- Local Strategy (email/password)
- Session-based Authentication
- Flash Messages for User Feedback
- HTTP-Only Cookies
- User Authentication (registration/login)
- Route Protection (authentication required)
- Theme Switching (light/dark)
- Secure Password Storage (bcrypt)
- Static Files Serving
- CRUD operations

### Basic CRUD Operations
- Create: `insertOne` and `insertMany`
- Read: `find` with projections
- Update: `updateOne`, `updateMany`, and `replaceOne`
- Delete: `deleteOne` and `deleteMany`

## Installation
```bash
git clone https://github.com/hayndehayn/PUG-EJS.git
cd pugproj
npm i
```

## Usage (in pugproj folder)
```bash
node server.js
```