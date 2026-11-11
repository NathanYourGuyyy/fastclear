# Convex calculator setup

The Convex project is isolated in `backend`. Run all commands below in Windows PowerShell.

1. Install Node.js if it is not already installed, then initialize the development deployment:

   ```powershell
   Set-Location C:\dev\nathan\fastclear\backend
   npm install convex
   npx convex dev
   ```

   Sign in/select the Convex account and create or select the development project when prompted. Keep the `.convex.cloud` and `.convex.site` URLs printed by the CLI. Development data and environment variables are separate from production.

2. Set the development environment variables. `ALLOWED_ORIGIN` must be the exact public origin of the site:

   ```powershell
   $SecureKey = Read-Host "Enter Resend API key" -AsSecureString
   $Credential = New-Object System.Management.Automation.PSCredential("Resend", $SecureKey)
   $PlainKey = $Credential.GetNetworkCredential().Password
   $PlainKey | npx convex env set RESEND_API_KEY
   Remove-Variable SecureKey, Credential, PlainKey
   npx convex env set ALLOWED_ORIGIN https://fastclearcargo.com
   ```

   The reply-to address is configured in `backend\convex\http.ts`.

3. Verify `fastclearcargo.com` in Resend by adding the DNS records Resend displays at the domain's DNS provider. Wait until Resend reports the domain as verified before sending to customer addresses. Before verification, send test messages only to your own Resend-authorized address.

4. Deploy the Convex functions and schema to production:

   ```powershell
   npx convex deploy
   ```

   Note both production URLs printed by the command. Set the production environment variables on the production deployment:

   ```powershell
   $SecureKey = Read-Host "Enter Resend API key" -AsSecureString
   $Credential = New-Object System.Management.Automation.PSCredential("Resend", $SecureKey)
   $PlainKey = $Credential.GetNetworkCredential().Password
   $PlainKey | npx convex env set RESEND_API_KEY --prod
   Remove-Variable SecureKey, Credential, PlainKey
   npx convex env set ALLOWED_ORIGIN https://fastclearcargo.com --prod
   ```

5. In `calculator-page.js`, replace `PASTE_PRODUCTION_CONVEX_SITE_URL` in the `CONVEX_SITE_URL` constant with the **production `.convex.site` URL**. Do not use the `.convex.cloud` URL in the browser. The development `.convex.site` URL is only for local testing.

Environment variable names used by this project: `RESEND_API_KEY`, `ALLOWED_ORIGIN`.
