# Community Poll Integrity (Transparent Community Polling)

A full-stack transparent community polling platform that guarantees voting fairness, eligibility verification, duplicate-vote prevention at the database layer, and zero-knowledge results locking until poll closure.

---

## Technical Integrity Guarantees

### 1. Duplicate Vote Prevention
- **Database-Level Compound Unique Index**: Integrity is guaranteed by MongoDB's unique index on the Vote collection:
  ```javascript
  VoteSchema.index({ pollId: 1, userId: 1 }, { unique: true });
  ```
- **Concurrency & Race Condition Proof**: Rather than relying only on an application-level find-then-insert check (which is vulnerable to race conditions), concurrent duplicate votes are caught atomically by MongoDB. When code `11000` (duplicate key error) is thrown, our centralized error middleware maps it directly to **HTTP 409 Conflict** (`DUPLICATE_VOTE`). Exactly one vote document is ever persisted.

### 2. Results Locking & Zero-Knowledge Secrecy
- **Server-Time Enforced**: Open vs closed status is calculated dynamically from the server clock (`new Date() < closesAt`) and is never stored in the database.
- **Strict 403 Results Lock**: `GET /api/polls/:id/results` returns **403 Forbidden** (`RESULTS_LOCKED`) with zero count data until the server time reaches or exceeds `closesAt`.
- **Zero Information Leakage**: The poll listing (`GET /api/polls`), user's polls (`GET /api/polls/mine`), and detail (`GET /api/polls/:id`) endpoints contain absolutely no vote counts, totals, or turnout metrics prior to closure.
- **Percentage Integrity (Hare-Niemeyer / Largest Remainder Method)**: After closure, percentages are rounded to ensure the sum across all options equals exactly 100%.

---

## Tech Stack

- **Frontend**: React (Vite), React Router v6, Mobile-First CSS (responsive down to 360px width)
- **Backend**: Node.js, Express REST API
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens) with bcrypt password hashing
- **Validation**: Zod schema validation
- **Testing**: Jest + Supertest with `mongodb-memory-server`

---

## Project Structure

```
/
├── package.json          # Root scripts
├── README.md             # Documentation
├── .gitignore
├── .env.example
├── server/
│   ├── package.json
│   ├── .env.example
│   ├── src/
│   │   ├── config/       # Database connection
│   │   ├── models/       # User, Poll, Vote Mongoose schemas
│   │   ├── routes/       # Auth and Poll routers (with /mine before /:id)
│   │   ├── controllers/  # Business logic & responses
│   │   ├── middleware/   # JWT auth, centralized error, Zod validation
│   │   ├── utils/        # Eligibility engine, Hare-Niemeyer math
│   │   ├── app.js
│   │   └── server.js
│   └── tests/
│       ├── setup.js      # mongodb-memory-server lifecycle
│       ├── auth.test.js
│       ├── poll.test.js
│       ├── vote.test.js
│       ├── results.test.js
│       └── acceptance.test.js
└── client/
    ├── package.json
    ├── .env.example
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── api/          # Fetch client with JWT authorization
        ├── context/      # React AuthContext
        ├── components/   # Navbar, StatusBadge, PollCard, ResultsBarChart, Alert, ProtectedRoute
        ├── pages/        # Login, Register, PollList, PollDetail, CreatePoll, Results, MyPolls
        ├── styles/       # Mobile-first CSS system (min 360px)
        ├── App.jsx
        └── main.jsx
```

---

## Environment Variables

### Server (`server/.env`)
| Variable | Description | Example |
|---|---|---|
| `PORT` | Port for Express server | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/poll_integrity` |
| `JWT_SECRET` | Secret key for signing JWTs | `super_secret_jwt_key` |
| `CLIENT_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |

### Client (`client/.env`)
| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Base URL for API calls | `http://localhost:5000/api` |

---

## Installation & Setup

### 1. Install Dependencies
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment Files
Copy the example environment files:
```bash
# Server
cp server/.env.example server/.env

# Client
cp client/.env.example client/.env
```

---

## Running the Application

### Running Tests
The automated test suite runs in-memory using `mongodb-memory-server`:
```bash
# Run all tests from root
npm test

# Or run directly in server/
cd server
npm test
```

### Running the Backend Server
```bash
cd server
npm start
# or for development mode with file watching:
npm run dev
```

### Running the Frontend Client
```bash
cd client
npm run dev
# The client will start at http://localhost:5173
```

### Building Frontend for Production
```bash
cd client
npm run build
```

---

## API Specification

All protected endpoints require `Authorization: Bearer <token>` in headers.

| Method | Endpoint | Auth | Description | Status Codes |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | No | Register new user account | `201`, `400`, `409` |
| `POST` | `/api/auth/login` | No | Authenticate user & receive JWT | `200`, `400`, `401` |
| `GET` | `/api/auth/me` | Yes | Get authenticated user profile | `200`, `401` |
| `POST` | `/api/polls` | Yes | Create poll with closing time & eligibility | `201`, `400`, `401` |
| `GET` | `/api/polls` | Yes | List polls (supports `?status=open\|closed`) | `200`, `401` |
| `GET` | `/api/polls/mine` | Yes | List polls created by authenticated user | `200`, `401` |
| `GET` | `/api/polls/:id` | Yes | Get poll details, options, eligibility & hasVoted | `200`, `400`, `401`, `404` |
| `POST` | `/api/polls/:id/vote` | Yes | Cast vote (`{ optionId }`) | `201`, `400`, `401`, `403`, `409` |
| `GET` | `/api/polls/:id/results` | Yes | Get tally & breakdown (Locked until closed) | `200`, `401`, `403`, `404` |

---

## Standard Error Response Format

All error responses from the API adhere to the standardized schema:
```json
{
  "error": {
    "message": "Human readable explanation",
    "code": "ERROR_CODE"
  }
}
```

Common error codes:
- `VALIDATION_ERROR` (400)
- `POLL_CLOSED` (400)
- `INVALID_OPTION` (400)
- `MISSING_TOKEN` / `INVALID_TOKEN` (401)
- `INELIGIBLE_USER` (403)
- `RESULTS_LOCKED` (403)
- `POLL_NOT_FOUND` (404)
- `DUPLICATE_VOTE` (409)
- `EMAIL_ALREADY_REGISTERED` (409)

