# RankForge AI Pro

Customer app: `/app`  
Admin panel: `/admin`

## Default admin credentials requested
Username: `ali`
Password: `ABC321`

For production, put these in environment variables and change the password before public launch. The admin route is not linked from the customer UI, but hidden URLs are NOT a security boundary; server-side authentication protects it.

## Run
1. Install Node.js 20+
2. Copy `.env.example` to `.env`
3. `npm install`
4. `npm start`
5. Open `http://localhost:3000/app`
6. Admin: `http://localhost:3000/admin`

## Included
- Customer signup/login
- 100 free credits on signup
- 5 credits per SEO generation
- Server-side credit enforcement
- SQLite database
- Customer SEO generation
- Admin dashboard
- User list
- Admin credit adjustment

## Still required for production
- Real AI API key + backend AI call
- Image/vision API
- Real keyword-data provider
- Payment gateway/webhook for the $1/100-credit package
- Production URL crawler and platform APIs
- HTTPS/domain
- Rate limiting, email verification, password reset, backups, monitoring
