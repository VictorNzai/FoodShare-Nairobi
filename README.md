# FoodShare-Nairobi

FoodShare-Nairobi is a simple web application that links food donors with verified charitable organisations. The project consists of a Node.js/Express backend and a collection of static HTML pages that make up the frontend.

## Directory structure

```
FoodShare-Nairobi/
├── backend/           # Express server, routes and database schema
│   ├── Database/      # SQL scripts and (optional) connection helpers
│   ├── Routes/        # API route handlers
│   └── server.js      # main Express server
├── frontend/          # HTML pages served by the backend
├── node_modules/      # packages installed from package.json
├── package.json       # Node dependencies
└── ...
```

- **backend** contains the Express server (`server.js`) and authentication routes (`Routes/auth.js`). A sample database schema is provided in `backend/Database/Database Schema/Users.sql`. Hosted separately on Render via https://foodshare-nairobi-1.onrender.com/
- **frontend** holds all the HTML pages (login, signup, dashboards, etc.). When the backend server runs, these pages are served as static files. Now Hosted on Netlify via https://foodsharenairobi.netlify.app/
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
   - `BASE_URL` – public URL for your server, used in password reset emails (defaults to `https://foodshare-nairobi-1.onrender.com`).
   - Database (MySQL): `DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `DATABASE_PORT`.
   - Email (Gmail): `EMAIL_USER`, `EMAIL_PASSWORD`.
4. **Run the backend**
   ```bash
   node backend/server.js
   ```
   The server starts on `https://foodshare-nairobi-1.onrender.com` and serves the files in the `frontend` folder.
5. **Access the frontend**
   Open your browser and navigate to `https://foodshare-nairobi-1.onrender.com/` or directly to pages such as `https://foodshare-nairobi-1.onrender.com/Login.html` or `Signup.html`.

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

## Deploying to Render

1. Push this repository to GitHub/GitLab.
2. In Render, create a new Web Service and connect the repo.
3. Environment: Node. Build command: (leave empty; Render runs `npm install`). Start command: `npm start`.
4. Add Environment Variables:
   - `BASE_URL` = your Render URL (e.g., https://foodshare.onrender.com)
   - `DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `DATABASE_PORT`
   - `EMAIL_USER`, `EMAIL_PASSWORD` (Gmail app password)
5. Database: use a managed MySQL provider (PlanetScale, Aiven, RDS) and fill the env vars accordingly. Render’s PostgreSQL is not compatible without code changes.
6. File uploads: `backend/uploads/charity-verifications` is stored on the instance disk which resets on deploys. For persistence, attach a Render Persistent Disk to store `backend/uploads`.
7. Health check: optional endpoint `GET /api/health` returns a JSON ok. Configure Render health checks to this path if desired.

### Local development with dotenv

Create a `.env` file in the project root:

```
DATABASE_HOST=127.0.0.1
DATABASE_USER=your_user
DATABASE_PASSWORD=your_password
DATABASE_NAME=foodshare_db
DATABASE_PORT=3306
BASE_URL=https://foodshare-nairobi-1.onrender.com
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
```
