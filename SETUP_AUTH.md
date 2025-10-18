# Supabase Authentication Setup Guide

Your app is connected to: https://ohbamexkbizqlwcvjbkt.supabase.co

## Required Supabase Configuration

### 1. Enable Email Authentication

Go to: https://app.supabase.com/project/ohbamexkbizqlwcvjbkt/auth/providers

1. Click on **Email** provider
2. Make sure "Enable Email provider" is **ON**
3. Under "Email Confirmation":
   - For development: Turn **OFF** "Confirm email"
   - For production: Keep it ON
4. Click **Save**

### 2. Configure Site URL

Go to: https://app.supabase.com/project/ohbamexkbizqlwcvjbkt/auth/url-configuration

1. Set **Site URL** to: `http://localhost:3000`
2. Add to **Redirect URLs**:
   - `http://localhost:3000/login`
   - `http://localhost:3000`
3. Click **Save**

### 3. Email Template Settings (Optional for Testing)

Go to: https://app.supabase.com/project/ohbamexkbizqlwcvjbkt/auth/templates

If you disabled email confirmation, you can skip this step.

## Testing Authentication

After configuration:

1. Go to http://localhost:3000/signup
2. Enter any email (e.g., test@example.com)
3. Create a password (min 6 characters)
4. Click Sign up

If email confirmation is disabled, you should be able to sign in immediately.
If enabled, check your email for the confirmation link.

## Common Issues

### "Email address is invalid"
- Check that Email provider is enabled in Supabase
- Disable email confirmation for testing
- Make sure you're using a valid email format

### "Invalid login credentials"
- Make sure you've signed up first
- Check that the password is correct
- Verify email if confirmation is enabled

### Sign up succeeds but can't sign in
- Email confirmation is likely enabled
- Check your email for confirmation link
- Or disable email confirmation in settings
