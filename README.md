# JavaRista Admin

Admin dashboard for managing JavaRista users, recipes, brew methods, brew logs, espresso dial-ins, subscriptions, analytics, and application settings.

## Setup

```bash
npm install
npm run dev
```

The Vite dev server is configured to run at:

```text
http://localhost:3000
```

## Environment Variables

Create `.env` in this `admin` directory:

```env
VITE_API_URL=http://localhost:5000/api
```

`VITE_API_URL` should point to the backend API root.

## Pages

- Login
- Dashboard
- Analytics
- Users
- User Detail
- Recipes
- Recipe Create/Edit
- Brew Methods
- Brew Method Create/Edit
- Brew Logs
- Espresso Shots
- Subscriptions
- Settings

## Connect To Backend

1. Start the backend API on port `5000`.
2. Confirm the backend exposes routes under `/api`.
3. Set `VITE_API_URL=http://localhost:5000/api` in `admin/.env`.
4. Start the admin app with `npm run dev`.
5. Sign in with an admin account.

The admin client attaches the stored auth token to API requests through the shared Axios instance in `src/api/axios.ts`.
