# Deployment

This site uses a Node server for the Google Drive gallery, media proxy, admin login,
and API routes. Deploy it to a Node-capable host connected to GitHub, not GitHub Pages.

## Railway Settings

- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Node app port: use the host-provided `PORT` environment variable
- Custom domain: `theknoxvilledroneguy.com`
- Volume mount path: `/data`

## Required Environment Variables

```bash
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REDIRECT_URI=https://theknoxvilledroneguy.com/api/google/auth/callback
GOOGLE_ADMIN_EMAIL=your_google_admin_email
GOOGLE_TOKEN_STORE_PATH=/data/.google-drive-auth.json
GOOGLE_DRIVE_GALLERY_FOLDER_ID=your_google_drive_folder_id
GALLERY_DB_PATH=/data/gallery.sqlite
```

Create a Railway volume and mount it at `/data`. Railway makes the mounted
directory available to the running service, so these files survive redeploys.

## Google OAuth

In Google Cloud, add this authorized redirect URI to the OAuth client:

```text
https://theknoxvilledroneguy.com/api/google/auth/callback
```

For local development, keep this redirect URI too:

```text
http://127.0.0.1:5173/api/google/auth/callback
```

## DNS

After the host gives you DNS records, add them at the domain registrar for:

```text
theknoxvilledroneguy.com
www.theknoxvilledroneguy.com
```
