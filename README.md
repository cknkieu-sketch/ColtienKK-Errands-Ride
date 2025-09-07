# ColtienKK Errands & Ride — Landing Page (Turn‑Key)

Mobile-friendly booking page with instant quotes using OpenRouteService. Bookings are logged to Google Sheets and email/SMS confirmations are sent.

## What’s included
- `index.html` — main landing page (TailwindCSS via CDN)
- `admin.html` + `assets/admin.js` — hidden admin page (password: `ckk-admin-2025`)
- `assets/app.js` — quote calc, ORS calls, form submit to GAS
- `gas/Code.gs` — Google Apps Script web app to log to Sheet and send confirmations
- Prefills Burlington, IA 52601 for pickup & drop ZIP/city (editable)
- Split address fields with basic validation
- Quote = base + (office→pickup + pickup→drop + drop→office) distance * $/mile + wait (after 10 min)
- Logs to Google Sheet **Requests** (ID: `1Cyqb3Qv30T-v-kM3-A9_b9s3AX9gOhY3D5y4FICshQ8`) and auto-creates headers

## One‑time setup (≈10–15 min)
1. **Copy GAS script:**
   - Open https://script.google.com > New project.
   - Replace the default code with the contents of `gas/Code.gs`.
   - Update `OWNER_EMAIL` if needed.
   - Click **Deploy → New deployment → Web app**:
     - *Execute as*: Me
     - *Who has access*: Anyone
   - Click **Deploy**, authorize, copy the **Web app URL**.

2. **Tell the site the Web App URL:**
   - Open `admin.html` in your browser.
   - Enter password `ckk-admin-2025`.
   - Paste the Web App URL into **Google Apps Script Web App URL**.
   - (Optional) Update office address & rates.
   - Click **Save Settings**.

3. **ORS key:**
   - The page is prefilled with your base64 ORS key (from your message).
   - If you need to change it, paste a base64-encoded key in Admin → ORS Key.
   - (Tip: if your key is plain text, base64 encode it first.)

4. **GitHub Pages:**
   - Create a repo (or use your existing `ColtienKK-Errands-Ride`).
   - Upload all files from this ZIP to the repo root.
   - Ensure **GitHub Pages** is enabled (main branch / root).
   - Your site: `https://cknkieu-sketch.github.io/ColtienKK-Errands-Ride/`

## Using the Admin page
- Go to `/admin.html` (e.g., add `/admin.html` to your Pages URL).
- Enter the password.
- Configure:
  - **Office address** (used to compute round trip)
  - **Rates**: base, $/mile, wait/min, free minutes
  - **ORS key** (base64) and **GAS URL**
- Settings are saved in your browser (localStorage) and used by `index.html`.

## Notes
- SMS is sent via email‑to‑SMS gateways for major carriers (AT&T, T‑Mobile, Verizon, US Cellular). If a carrier is not selected, only email is sent.
- Distance is computed with ORS Directions for three legs: office→pickup, pickup→drop, drop→office.
- Central Time display is handled by your local device time. GAS stores ISO timestamps.
- You can add new features by extending sections inside `assets/app.js`.

## Troubleshooting
- **“Admin: Please set your Google Apps Script Web App URL”** — open Admin and paste the URL.
- **“Address not found / Routing failed”** — check addresses and your ORS key/quotas.
- **No rows in Sheet** — ensure the tab is named exactly **Requests** and the Web App is deployed with access **Anyone**.
