# UserTodo-2

**UserTodo-2 is a modern, full-stack To-Do List application that helps users organize their tasks efficiently.** 

The application provides a clean, dark-themed interface where users can:
- Create secure accounts with JWT authentication
- Manage personal tasks with titles, descriptions, and priorities
- Set due dates and track completion status
- Filter tasks by status (active, completed) or priority level
- Search tasks in real-time
- Enjoy a responsive design that works on all devices

Built entirely with JavaScript - Node.js and Express on the backend, vanilla JavaScript on the frontend, with SQLite for data storage.

## Features

- **User Authentication**: Secure login/registration with JWT tokens
- **Task Management**: Create, edit, delete, and mark tasks as complete
- **Priority Levels**: Set tasks as high, medium, or low priority
- **Due Dates**: Optional deadlines for tasks
- **Search & Filter**: Real-time search and filtering by status/priority
- **Dark Mode**: Modern dark theme UI with animated backgrounds
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Vercel Postgres** - PostgreSQL database with @vercel/postgres
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **cors** - Cross-origin requests
- **dotenv** - Environment variables

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with custom properties
- **Vanilla JavaScript** - No frameworks, ES6+
- **Google Fonts** - Inter typography

### Database
- **PostgreSQL** - Relational database via Vercel Postgres
- **Serverless-compatible** - Designed for Vercel deployment

## Installation

1. Clone the repository
```bash
git clone https://github.com/jamaal20/userTodo-2.git
cd userTodo-2
```

2. Install dependencies
```bash
npm install
```

3. Create `.env` file
```env
PORT=3000
JWT_SECRET=your-secret-key-here
POSTGRES_URL=your-postgres-connection-string
```

4. Start the application
```bash
npm start
```

5. Open your browser and navigate to `http://localhost:3000`

## Vercel Deployment

1. **Create Vercel Postgres Database:**
   - Go to Vercel dashboard → Storage → Create Database
   - Choose Postgres (Neon integration)

2. **Deploy to Vercel:**
   ```bash
   npx vercel --prod
   ```

3. **Set Environment Variables:**
   - `JWT_SECRET` - Your secret JWT key
   - `POSTGRES_URL` - Auto-added by Vercel Postgres

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - User login

### Tasks
- `GET /api/tasks` - Get all user tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

## Project Structure

```
userTodo-2/
├── app.js              # Main server file
├── db-postgres.js       # PostgreSQL database setup
├── vercel.json          # Vercel deployment config
├── middleware/          # Express middleware
│   └── auth.js          # JWT authentication
├── routes/              # API routes
│   ├── auth.js          # Authentication endpoints
│   └── tasks.js         # Task endpoints
├── public/              # Frontend files
│   ├── index.html       # Login page
│   ├── app.html         # Main dashboard
│   ├── css/
│   │   └── styles.css   # Styles
│   └── js/
│       ├── auth.js      # Authentication logic
│       └── app.js       # Dashboard logic
└── package.json         # Dependencies
```

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License
