This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Production Auth Environment Setup

To make admin login work correctly on deployed environments (frontend and backend on different domains), set these environment variables:

### Frontend (Vercel)

- `NEXT_PUBLIC_API_BASE_URL=https://<your-backend-domain>`

Example:

- `NEXT_PUBLIC_API_BASE_URL=https://boxed-bliss.onrender.com`

### Backend (Render/Node host)

- `NODE_ENV=production`
- `FRONTEND_URL=https://<your-frontend-domain>`
- `ADMIN_JWT_SECRET=<strong-random-secret>`
- `ADMIN_EMAIL=<admin-email>`
- `ADMIN_PASSWORD=<admin-password-or-bcrypt-hash>`

Notes:

- `FRONTEND_URL` can contain multiple comma-separated origins if needed.
- In production, auth cookie is set with `secure: true` and `sameSite: "none"`.
- Frontend requests already send credentials (`credentials: "include"`) and include Bearer token when available.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
