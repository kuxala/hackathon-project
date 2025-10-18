# Google OAuth Setup Guide

## Supabase Callback URL

When setting up Google OAuth, you'll need this **Authorized Redirect URI**:

```
https://ohbamexkbizqlwcvjbkt.supabase.co/auth/v1/callback
```

## Step 1: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Configure the OAuth consent screen if prompted
6. For Application type, select **Web application**
7. Add these URIs:

   **Authorized JavaScript origins:**
   ```
   http://localhost:3000
   https://ohbamexkbizqlwcvjbkt.supabase.co
   ```

   **Authorized redirect URIs:**
   ```
   https://ohbamexkbizqlwcvjbkt.supabase.co/auth/v1/callback
   http://localhost:3000
   ```

8. Click **Create**
9. Copy your **Client ID** and **Client Secret**

## Step 2: Configure Supabase

1. Go to your Supabase Dashboard:
   https://app.supabase.com/project/ohbamexkbizqlwcvjbkt/auth/providers

2. Find **Google** in the providers list

3. Toggle **Enable Google provider** to ON

4. Paste your Google credentials:
   - **Client ID**: [Your Google Client ID]
   - **Client Secret**: [Your Google Client Secret]

5. Click **Save**

## Step 3: Test Google Sign In

1. Go to http://localhost:3000/login or http://localhost:3000/signup
2. Click the "Google" button
3. You should be redirected to Google's sign-in page
4. After signing in, you'll be redirected back to your app dashboard

## Important Notes

- **For Production**: Update the redirect URIs in Google Cloud Console to include your production domain
- **Site URL**: Make sure your Site URL in Supabase (Auth → URL Configuration) is set to `http://localhost:3000` for local development
- **Testing**: You might need to add test users in Google Cloud Console if your OAuth consent screen is in testing mode

## Troubleshooting

### "redirect_uri_mismatch" error
- Make sure the redirect URI in Google Console exactly matches:
  `https://ohbamexkbizqlwcvjbkt.supabase.co/auth/v1/callback`

### Google sign-in popup blocked
- Check if your browser is blocking popups
- Allow popups for localhost:3000

### After signing in, redirected to wrong page
- Check the `redirectTo` option in the code (currently set to `/`)
