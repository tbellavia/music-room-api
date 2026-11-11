// Shared HTML of the emails: inline styles, light and dark themes
export function mailLayout(title: string, content: string): string {
  return `
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <style>
    body { margin:0; padding:0; background:#f6f9fc; color:#1a202c; }
    .wrapper { width:100%; padding:24px; background:#f6f9fc; }
    .container { max-width:600px; margin:0 auto; background:#ffffff; border-radius:8px; overflow:hidden; }
    .content { padding:24px 24px 8px; font-size:15px; line-height:1.6; }
    .otp {
      display:block;
      font-family: Menlo, Consolas, Monaco, monospace;
      font-weight: 800;
      letter-spacing: 4px;
      font-size: 28px;
      text-align: center;
      color:#111827;
      background:#f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px 20px;
      margin: 16px 0 8px;
    }
    .muted { color:#6b7280; font-size:13px; text-align:center; }
    @media (prefers-color-scheme: dark) {
      body { background:#0b1220; color:#e5e7eb; }
      .container { background:#0f172a; }
      .content { color:#e5e7eb; }
      .otp { background:#0b1220; border-color:#233044; color:#e5e7eb; }
      .muted { color:#94a3b8; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container" role="article" aria-roledescription="email">
      <div class="content">
${content}
      </div>
    </div>
  </div>
</body>
</html>`;
}
