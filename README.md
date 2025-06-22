# FoodShare-Nairobi

FoodShare-Nairobi is a simple web application that links food donors with verified charitable organisations. The project consists of a Node.js/Express backend and a collection of static HTML pages that make up the frontend.

## Directory structure

```
FoodShare-Nairobi/
├── backend/           # Express server, routes and database schema
│   ├── Database/      # SQL scripts and (optional) connection helpers
│   ├── Routes/        # API route handlers
│   ├── app.js         # (empty placeholder)
│   └── server.js      # main Express server
├── frontend/          # HTML pages served by the backend
├── node_modules/      # packages installed from package.json
├── package.json       # Node dependencies
└── ...
```

- **backend** contains the Express server (`server.js`) and authentication routes (`Routes/auth.js`). A sample database schema is provided in `backend/Database/Database Schema/Users.sql`.
- **frontend** holds all the HTML pages (login, signup, dashboards, etc.). When the backend server runs, these pages are served as static files.
- **node_modules** is created when you run `npm install` and stores all packages defined in `package.json`.

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher recommended)
- [MySQL](https://www.mysql.com/) server

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```
   This will read `package.json` and install packages such as `express`, `mysql2`, `bcrypt`, `nodemailer` and others into `node_modules`.
2. **Create the database**
   - Start MySQL and run the SQL script `backend/Database/Database Schema/Users.sql` to create the required tables.
   - Update the connection details in `backend/server.js` and `backend/Routes/auth.js` if your MySQL credentials differ.
3. **Environment variables**
   - `BASE_URL` – public URL for your server, used in password reset emails (defaults to `http://localhost:3000`).
   - MySQL credentials – edit `backend/server.js` if necessary (host, user, password, database, port).
   - Gmail credentials – `backend/Routes/auth.js` uses Gmail via `nodemailer` for password reset emails; update the `user` and `pass` fields with your account.
4. **Run the backend**
   ```bash
   node backend/server.js
   ```
   The server starts on `http://localhost:3000` and serves the files in the `frontend` folder.
5. **Access the frontend**
   Open your browser and navigate to `http://localhost:3000/` or directly to pages such as `http://localhost:3000/Login.html` or `Signup.html`.

## Dependencies

`package.json` lists several dependencies required for the backend:

- `express`, `cors` – web framework and CORS support
- `mysql2` – MySQL database connector
- `bcrypt` – password hashing
- `body-parser` – request body parsing
- `nodemailer` – sending password reset emails

`node_modules/` is where these packages are installed. It is not committed to version control but is necessary for running the server.

## Example usage

After configuring the database and environment variables, run `node backend/server.js`. You can then register as a donor or charity on the signup page and log in to see the respective dashboard pages. Screenshots or additional walkthroughs can be added here if desired.

