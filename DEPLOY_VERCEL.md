# VChat-Web Vercel Deployment Guide

## Exact Deployment Steps

1. **Install Vercel CLI (Optional but recommended):**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy to Vercel (Interactive):**
   Run the following command at the root of the project:
   ```bash
   vercel
   ```
   - Follow the prompts to link the local directory to a Vercel project.
   - Accept the default build settings (`npm run build`, `dist` output directory).

4. **Deploy to Production:**
   Once you're happy with the preview deployment, push it to production:
   ```bash
   vercel --prod
   ```
   *(Alternatively, push your code to a GitHub repository connected to your Vercel account for automatic deployments).*

## Required Environment Variables

You must add the following environment variables to your Vercel project settings (Settings > Environment Variables) before the app will function properly. You can find these values in your local `.env` file:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

## Post-Deployment Verification Checklist

Once your deployment finishes, visit your Vercel app URL and verify the following:

- [ ] **Routing & SPA Behavior:** Navigate to a route like `/chat`, refresh the page, and confirm it does not result in a 404 error (This is handled by the `vercel.json` rewrites we added).
- [ ] **Firebase Authentication:** Ensure you can log in, log out, or register a new user successfully.
- [ ] **Firestore Database:** Send a test message or create a group to ensure database reads/writes are functioning.
- [ ] **Storage Uploads:** Upload a profile picture or an attachment to a chat to confirm Firebase Storage permissions and connectivity work correctly on the production domain.
