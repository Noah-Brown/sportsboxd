# Sportsboxd MVP (Letterboxd for Sports)

A minimal, local-first prototype that lets fans:
- Check in to games (attended or watched), with optional rating + comment
- See a real-time feed of check-ins
- Join a live discussion thread per game (Socket.IO)

## Tech
- **Backend:** Node.js (Express), SQLite (better-sqlite3), Socket.IO
- **Frontend:** React (Vite), TailwindCSS, axios, react-router, socket.io-client

## Run locally
In two terminals:
```bash
# Terminal 1
cd server
npm install
npm start

# Terminal 2
cd client
npm install
npm run dev
```
Frontend runs on http://localhost:5173, API on http://localhost:4000.

## Notes / Next steps
- Add proper accounts (OAuth via Apple/Google) and sessions
- Game data ingestion (MLB/NBA/NFL schedules and scores)
- Rich game pages with line scores, stats, and media
- User profiles, lists, and "watched" history
- Moderation tools and report/flag system
- Pagination, infinite scroll, and caching
- Migrate to Postgres + Prisma; consider Supabase for realtime + auth
