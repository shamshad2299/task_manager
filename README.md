# Team Task Manager

A premium full-stack Next.js project manager with TypeScript, Prisma, SQLite, authentication, projects, tasks, **premium dark UI**, and comprehensive security features.

##  Features

### Core Functionality
-  Authentication (Signup/Login with JWT)
-  Project & team management
-  Task creation, assignment & status tracking (TODO → IN_PROGRESS → DONE)
-  Dashboard with stats and task overview
-  Role-based access control (ADMIN/MEMBER)

###  Premium UI
- **Modern Dark Theme**: Slate-900 gradient with sleek card design
- **Responsive Layout**: Mobile-first, works on all devices
- **Interactive Components**: Loading states, hover effects, focus rings
- **Status Indicators**: Color-coded task status badges
- **Tabbed Navigation**: Overview, Projects, and Tasks tabs
- **Real-time Feedback**: Success/error messages with icons

###  Security
- **Input Validation**: Email, password, name validation
- **Rate Limiting**: 5 signup / 20 login attempts per hour per IP
- **JWT Authentication**: 7-day token expiration
- **Password Hashing**: bcryptjs with 10 salt rounds
- **XSS Protection**: Input sanitization for all user input
- **HTTP Security Headers**: X-Frame-Options, X-Content-Type-Options, etc.
- **CORS Configuration**: Restricted origin with configurable domain
- **Row-Level Security**: Users only access their own data
- **Role-Based Access**: ADMIN and MEMBER roles with different permissions

##  Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Database

```bash
npx prisma db push
```

This creates `prisma/dev.db` with the schema:
- **User**: name, email, password, role (ADMIN/MEMBER)
- **Project**: name, description, owner, members
- **Task**: title, description, status (TODO/IN_PROGRESS/DONE), project, assignee, dueDate

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Build for Production

```bash
npm run build
npm run start
```

##  Usage

### 1. Signup
- First user automatically becomes ADMIN
- Others sign up as MEMBER
- Password must be at least 8 characters
- Email must be unique

### 2. Login
- Enter registered email and password
- JWT token stored in browser localStorage
- Auto-redirect to dashboard on success

### 3. Create Project
- From dashboard Overview tab
- Add member emails (comma-separated) to invite
- Non-existent emails won't be added (they must sign up first)

### 4. Create Task
- Select project from dropdown
- Optionally assign to user by ID
- Set due date
- Status starts as TODO

### 5. Track Tasks
- Tasks tab shows all assigned/owned tasks
- Click "Move to {status}" to advance through workflow
- Project owners and ADMINs can update any project task
- Members can only update their assigned tasks

##  Architecture

### Tech Stack
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Prisma ORM + SQLite
- **Auth**: JWT + bcryptjs
- **Security**: Rate limiting, input validation, XSS protection

### Project Structure
```
├── pages/
│   ├── _app.tsx              # App wrapper with global CSS
│   ├── index.tsx             # Landing page
│   ├── login.tsx             # Premium login UI
│   ├── signup.tsx            # Premium signup UI
│   ├── dashboard.tsx         # Main dashboard (tabbed)
│   └── api/
│       ├── auth/
│       │   ├── login.ts      # Login endpoint
│       │   └── signup.ts     # Signup endpoint (rate limited)
│       ├── users/
│       │   └── me.ts         # Get current user
│       ├── projects/
│       │   └── index.ts      # List/create projects
│       └── tasks/
│           ├── index.ts      # List/create tasks
│           └── [id].ts       # Update task status
├── lib/
│   ├── prisma.ts             # Prisma client singleton
│   ├── auth.ts               # JWT & password utilities
│   └── security.ts           # Validation, rate limiting, headers
├── prisma/
│   └── schema.prisma         # Database schema
└── styles/
    └── globals.css           # Tailwind + global styles
```

### API Endpoints

#### Authentication
- `POST /api/auth/signup` - Register new user (rate limited)
- `POST /api/auth/login` - Login user (rate limited)

#### User
- `GET /api/users/me` - Get current user (requires auth)

#### Projects
- `GET /api/projects` - List user's projects (requires auth)
- `POST /api/projects` - Create project (requires auth)

#### Tasks
- `GET /api/tasks` - List user's tasks (requires auth)
- `POST /api/tasks` - Create task (requires auth)
- `PATCH /api/tasks/[id]` - Update task status (requires auth)

All responses include security headers (CORS, XSS-Protection, etc.)

##  Security Details

See [SECURITY.md](./SECURITY.md) for comprehensive security documentation including:
- Input validation strategies
- Rate limiting implementation
- JWT token management
- RBAC enforcement
- HTTP security headers
- OWASP protection mechanisms

## 📱 Responsive Breakpoints

- **Mobile**: < 768px (single column)
- **Tablet**: 768px - 1024px (2 columns)
- **Desktop**: > 1024px (3 columns)

##  Color Scheme

- **Primary**: Blue-500/600 (actions)
- **Success**: Green-500/600 (creation)
- **Danger**: Red-600/700 (logout)
- **Status**: Yellow (TODO), Blue (IN_PROGRESS), Green (DONE)
- **Background**: Slate-900/800 gradient
- **Text**: White, Slate-300/400

##  Environment Variables
```bash
DATABASE_URL="file:./prisma/dev.db"    # SQLite path
JWT_SECRET="change_this_secret"         # Change in production!
ALLOWED_ORIGIN="http://localhost:3000"  # CORS origin
```

##  Deployment

1. Set production environment variables
2. Run `npm run build`
3. Deploy to Vercel, Heroku, or your preferred host
4. Update database connection string for production database
5. Configure HTTPS and security headers at reverse proxy

##  License

MIT

##  Contributing

Pull requests welcome! Please ensure:
- TypeScript passes `npm run build`
- Security and input validation are maintained
- UI remains responsive and accessible
# task_manager
