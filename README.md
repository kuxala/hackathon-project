# Hackathon App

A simple, clean full-stack authentication app built with Next.js, Supabase, and Tailwind CSS.

## Tech Stack

- **Next.js 15.5.6** - React framework with App Router and Turbopack
- **TypeScript** - Type-safe development
- **Tailwind CSS 3** - Utility-first styling
- **Supabase** - Authentication and database
- **React Context** - State management

## Features

- User registration with email confirmation
- Email/password authentication
- Protected routes
- Simple, clean UI
- Responsive design

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

The Supabase credentials are already configured in `.env.local`. The app is connected to:
- Project: https://ohbamexkbizqlwcvjbkt.supabase.co

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
/src
  /app
    /login       - Login page
    /signup      - Sign up page
    page.tsx     - Protected home page
    layout.tsx   - Root layout with AuthProvider
  /contexts
    AuthContext.tsx - Authentication context and hooks
  /lib
    supabase.ts  - Supabase client configuration
```

## How It Works

1. **Sign Up**: New users register at `/signup` and receive a confirmation email
2. **Login**: Users sign in at `/login` with their credentials
3. **Home**: Authenticated users see their profile at `/`
4. **Sign Out**: Users can log out from the home page

## Authentication Flow

- Uses Supabase Auth for user management
- AuthContext provides `user`, `signUp`, `signIn`, `signOut` functions
- Home page (`/`) is protected - redirects to `/login` if not authenticated
- Auth state persists across page refreshes

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
