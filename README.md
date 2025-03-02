# Express.js + Mongoose Authentication System

Simple login/register page with authentication and session management.

## Technologies Used

- **Backend Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Passport.js
- **Template Engine**: Pug
- **Session Management**: express-session
- **Password Hashing**: bcrypt

## Authentication & Security
- User Registration and Login
- Session-based Authentication
- Password Hashing with bcrypt
- Protected Routes
- HTTP-Only Cookies
- Flash Messages for User Feedback

---

### Installation and usage
```bash
git clone https://github.com/hayndehayn/Express-MongoDB.git
cd pugproj
npm i
node server.js
```

---

### Enviroment-variables in .env file
```bash
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
PORT=3000
```