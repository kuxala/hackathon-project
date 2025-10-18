# Backend Services Architecture

## Current Stack

- **Frontend**: Next.js 15 (React, TypeScript)
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage (if needed)

## Backend Service Locations

### 1. Next.js API Routes (`/src/app/api/`)

This is where you write your backend services. Each folder in `/src/app/api/` becomes an API endpoint.

**Structure:**
```
src/app/api/
├── example/
│   └── route.ts          # GET/POST /api/example
├── users/
│   └── route.ts          # GET/POST /api/users
├── projects/
│   ├── route.ts          # GET/POST /api/projects
│   └── [id]/
│       └── route.ts      # GET/PUT/DELETE /api/projects/:id
```

**Example API Route:**
```typescript
// src/app/api/users/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('users')
    .select('*')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()

  const { data, error } = await supabase
    .from('users')
    .insert(body)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
```

### 2. Server Actions (Alternative for form handling)

For form submissions, you can use Next.js Server Actions:

```typescript
// src/app/actions.ts
'use server'

import { supabase } from '@/lib/supabase'

export async function createProject(formData: FormData) {
  const name = formData.get('name')

  const { data, error } = await supabase
    .from('projects')
    .insert({ name })

  if (error) throw error
  return data
}
```

### 3. Supabase Database Functions

For complex queries, you can write PostgreSQL functions directly in Supabase:

1. Go to: https://app.supabase.com/project/ohbamexkbizqlwcvjbkt/database/functions
2. Create SQL functions
3. Call them from your API routes:

```typescript
const { data } = await supabase.rpc('your_function_name', { param: 'value' })
```

### 4. Utility Functions (`/src/lib/`)

Reusable backend logic:

```
src/lib/
├── supabase.ts           # Supabase client
├── auth.ts               # Auth utilities
├── database.ts           # Database queries
└── services/
    ├── userService.ts    # User-related logic
    └── projectService.ts # Project-related logic
```

## API Endpoints You Can Create

### Authentication (handled by Supabase)
- Sign up: Use Supabase Auth (already implemented)
- Sign in: Use Supabase Auth (already implemented)
- Sign out: Use Supabase Auth (already implemented)

### Custom Endpoints (examples)
- `POST /api/projects` - Create project
- `GET /api/projects` - List projects
- `GET /api/projects/[id]` - Get project details
- `PUT /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project

## How to Call API Routes from Frontend

```typescript
// In your React component
const createProject = async (name: string) => {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  })

  const data = await response.json()
  return data
}
```

## Authentication in API Routes

To protect API routes, check for authenticated user:

```typescript
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  // Get session from cookie or header
  const token = request.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify token with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // User is authenticated, proceed with request
  // ...
}
```

## Database Schema

Create tables in Supabase:
1. Go to: https://app.supabase.com/project/ohbamexkbizqlwcvjbkt/editor
2. Create tables using SQL or the table editor
3. Access them from your API routes using Supabase client

## Next Steps

1. **Design your database schema** in Supabase
2. **Create API routes** in `/src/app/api/` for your business logic
3. **Call the APIs** from your React components
4. **Add middleware** for authentication if needed

## Example: Complete CRUD API

Create `/src/app/api/projects/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET all projects
export async function GET() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST new project
export async function POST(request: Request) {
  const body = await request.json()

  const { data, error } = await supabase
    .from('projects')
    .insert(body)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data[0])
}
```

Now you have `/api/projects` endpoint that you can use!
