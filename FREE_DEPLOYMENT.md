# Free Deployment

This project is simplest to deploy as one free Render Web Service. The backend serves the React build in production, so the UI and API live on the same URL:

- UI: `https://your-service.onrender.com`
- API: `https://your-service.onrender.com/api/...`
- Health check: `https://your-service.onrender.com/health`

## 1. Create Free MongoDB Atlas Database

1. Create a MongoDB Atlas free cluster.
2. Create a database user.
3. In Network Access, allow access from anywhere for deployment testing: `0.0.0.0/0`.
4. Copy the connection string and replace the password.

Example:

```text
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/team-task-manager?retryWrites=true&w=majority
```

## 2. Deploy On Render

1. Push this repo to GitHub.
2. Go to Render.
3. Choose New > Blueprint.
4. Select this repository.
5. Render will read `render.yaml` and create a free web service.
6. When prompted for `MONGODB_URI`, paste your Atlas connection string.
7. Deploy.

Render will run:

```text
npm install && cd backend && npm install && cd ../frontend && npm install && npm run build
cd backend && npm start
```

## 3. Test

Open:

```text
https://your-service.onrender.com/health
```

You should see JSON with `"status": "ok"`.

Then open:

```text
https://your-service.onrender.com/
```

The React UI should load from the same backend service.

## Notes

- Render free web services sleep after inactivity, so the first request can take about a minute.
- MongoDB Atlas free clusters are enough for this app while testing.
- Do not deploy this project to Vercel and Render at the same time unless you intentionally split frontend and backend.
