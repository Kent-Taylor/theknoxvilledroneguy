# The Knoxville Drone Guy

Vue 3 + Vite site for The Knoxville Drone Guy with a server-owned Instagram feed endpoint.

## Development

```bash
npm install
npm run dev
```

The Vite dev server includes `/api/instagram` through local middleware.

## Production

```bash
npm run build
npm run start
```

`npm run start` serves `dist/` and the `/api/instagram` endpoint from `server/index.js`.

## Instagram Environment Variables

Create `.env` from `.env.example` and fill in the server-only values:

```bash
INSTAGRAM_APP_ID=your_instagram_app_id
INSTAGRAM_APP_SECRET=your_instagram_app_secret
INSTAGRAM_REDIRECT_URI=http://127.0.0.1:5173/api/instagram/auth/callback
INSTAGRAM_LOGIN_SCOPES=instagram_business_basic
INSTAGRAM_ACCESS_TOKEN=your_long_lived_meta_access_token
INSTAGRAM_PROFESSIONAL_ACCOUNT_ID=me
INSTAGRAM_API_VERSION=v24.0
INSTAGRAM_API_BASE_URL=https://graph.instagram.com
INSTAGRAM_CACHE_TTL_SECONDS=1800
INSTAGRAM_MEDIA_LIMIT=9
INSTAGRAM_TOKEN_STORE_PATH=.instagram-auth.json
```

Do not prefix secrets with `VITE_`. Vite exposes `VITE_` variables to the browser.

## Meta Setup Notes

Use the current Instagram Platform API with Instagram Login for a professional Instagram account.
This feed does not require site visitors to log in, and it does not require a Facebook Page connection
for this Instagram Login flow. The site owner only needs to authorize the app server-side/token-side.

1. Confirm `@the_knoxville_drone_guy` is a Business or Creator account.
2. Create a Meta developer app and configure Instagram API with Instagram Login.
3. Add `INSTAGRAM_REDIRECT_URI` in the Meta app exactly as your callback URL.
4. Request the current read scope `instagram_business_basic`. The broader current scopes are optional unless you need publishing, comments, or messages.
5. Start the local auth flow at `/api/instagram/auth/start` and log into `@the_knoxville_drone_guy`.
6. The callback exchanges the code, upgrades to a long-lived token, fetches the authorized account profile, and stores the result in `.instagram-auth.json` on the server.
7. Keep `INSTAGRAM_PROFESSIONAL_ACCOUNT_ID=me` unless you specifically want to pin the feed to a known account id.
8. Restart the server after updating `.env`.

Additional current Instagram Login scopes exist for broader features, but are not needed for this
read-only feed: `instagram_business_content_publish`, `instagram_business_manage_comments`, and
`instagram_business_manage_messages`.

## Auth Endpoints

These routes are server-side only:

- `/api/instagram` — returns the normalized media feed JSON for the Vue page
- `/api/instagram/auth/start` — starts Instagram Login
- `/api/instagram/auth/callback` — exchanges the authorization code and stores the token
- `/api/instagram/auth/status` — reports whether the server is already connected
- `/api/instagram/auth/refresh` — refreshes the stored long-lived token

## Google Drive Gallery Admin

The public gallery route is `/gallery`, and it renders media from the site database and
streams Google Drive files through the server. Visitors do not need a Google login, and the
admin Google login does not request Drive access.

Set these server-only values in `.env`:

```bash
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:5173/api/google/auth/callback
GOOGLE_ADMIN_EMAILS=your_google_email@example.com,another_admin@example.com
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"drive-gallery@high-torch-428822-i7.iam.gserviceaccount.com"}
GOOGLE_DRIVE_GALLERY_FOLDER_ID=your_google_drive_folder_id
GALLERY_DB_PATH=data/gallery.sqlite
```

Create a Google Cloud OAuth client and add the redirect URI above for admin identity only. Keep the
OAuth scopes limited to `openid`, `email`, and `profile`; do not add Google Drive scopes.
Set `GOOGLE_ADMIN_EMAILS` to a comma-separated list of Google accounts that can access `/login`.

Create a Google service account, then share the configured Google Drive gallery folder with the
service account email. For production, that email is
`drive-gallery@high-torch-428822-i7.iam.gserviceaccount.com`. The server uses that service account
to sync the configured Drive folder on gallery load, stores gallery order/thumbnails in SQLite, and
exposes:

- `/api/gallery` — syncs the Google Drive folder and returns public ordered gallery JSON
- `/api/gallery/media/:driveId` — public media stream proxied through the server
- `/api/gallery/admin` — admin gallery data
- `/api/gallery/reorder` — saves drag order
- `/api/gallery/items/:driveId` — saves title, visibility, and selected thumbnail

## Careers Storage And Email

Jobs and applications are stored in the same SQLite database as the gallery settings. On Railway,
mount a persistent volume at `/data` and set:

```bash
GALLERY_DB_PATH=/data/gallery.sqlite
```

Without a Railway volume, files written by a deployment are temporary and job posts can disappear
after a restart or redeploy.

Application notifications use the Resend email API directly from the server. Verify
`theknoxvilledroneguy.com` in Resend, then add these Railway service variables:

```bash
RESEND_API_KEY=re_your_resend_api_key
CAREERS_FROM_EMAIL=The Knoxville Drone Guy <careers@theknoxvilledroneguy.com>
CAREERS_NOTIFICATION_EMAIL=theknoxvilledroneguy@gmail.com
```

The applicant's resume is attached to the notification. These values are server-only and must not
use a `VITE_` prefix.

The endpoint requests only the fields needed by the UI:

```text
id,caption,media_type,media_url,thumbnail_url,permalink,timestamp
```

The endpoint returns:

```json
[
  {
    "id": "string",
    "caption": "string",
    "media_type": "IMAGE",
    "media_url": "https://...",
    "thumbnail_url": "https://...",
    "permalink": "https://instagram.com/...",
    "timestamp": "2026-04-20T12:00:00+0000"
  }
]
```

Responses are cached in memory for `INSTAGRAM_CACHE_TTL_SECONDS`, clamped between 15 and 60 minutes.
