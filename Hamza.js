require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const axios = require('axios');

const app = express();
app.use(express.json());

const BASE_DOMAIN = process.env.BASE_DOMAIN;
const SITES_AVAILABLE = '/etc/nginx/sites-available';
const SITES_ENABLED = '/etc/nginx/sites-enabled';
const ERROR_PAGE_DIR = '/var/www/errors';
const ERROR_PAGE_PATH = path.join(ERROR_PAGE_DIR, '502.html');

app.get('/error-502', (req, res) => {
  const { port, domain } = req.query;

  res.send(`
    <html>
      <head><title>502 Bad Gateway</title></head>
      <body style="font-family:sans-serif; background:#1a1a1a; color:#fff; text-align:center; padding:100px;">
        <h1>🚫 502 - Bad Gateway</h1>
        <p>Your app <strong>${domain}</strong> is not active or not listening on port <strong>${port}</strong>.</p>
        <p>Please make sure the app is running and listening on the correct port.</p>
      </body>
    </html>
  `);
});

// ➕ CREATE Subdomain
app.post('/create-subdomain', async (req, res) => {
  const { subdomain, port, ip } = req.body;
  if (!subdomain || !port || !ip) {
    return res.status(400).json({ error: 'Missing subdomain, port or ip' });
  }

  const domain = `${subdomain}.${BASE_DOMAIN}`;
  const configPath = path.join(SITES_AVAILABLE, domain);
  const symlinkPath = path.join(SITES_ENABLED, domain);

  const config = `
  server {
      listen 80;
      server_name ${domain};
  
      location / {
          proxy_pass http://${ip}:${port};
          proxy_http_version 1.1;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_connect_timeout 3;
          proxy_read_timeout 5;
      }
  
      error_page 502 = @custom502;
  
      location @custom502 {
          proxy_pass http://localhost:4000/error-502?port=${port}&domain=${domain};
      }
  }
  `;
  
  try {
    fs.writeFileSync(configPath, config);
    if (!fs.existsSync(symlinkPath)) fs.symlinkSync(configPath, symlinkPath);

    execSync('nginx -t');
    execSync('systemctl reload nginx');

    // Check if DNS already exists
    const existingRecords = await axios.get(
      `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/dns_records?name=${domain}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        },
      }
    );

    const existing = existingRecords.data.result[0];
    let cfRes;

    if (existing) {
      // Update existing DNS record
      cfRes = await axios.put(
        `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/dns_records/${existing.id}`,
        {
          type: 'A',
          name: domain,
          content: ip,
          ttl: 120,
          proxied: false,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } else {
      // Create new DNS record
      cfRes = await axios.post(
        `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/dns_records`,
        {
          type: 'A',
          name: domain,
          content: ip,
          ttl: 120,
          proxied: false,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (!cfRes.data.success) {
      return res.status(500).json({ error: 'Cloudflare DNS failed', detail: cfRes.data });
    }

    console.log("🕒 Waiting for DNS propagation...");
    await new Promise(resolve => setTimeout(resolve, 10000));

    try {
      execSync(`certbot --nginx --non-interactive --agree-tos -d ${domain} -m admin@${BASE_DOMAIN}`);
    } catch (sslErr) {
      console.warn(`⚠️ SSL generation failed for ${domain}:`, sslErr.message);
    }

    return res.json({
      status: 'success',
      domain,
      message: existing ? 'Subdomain updated, DNS updated, SSL attempted' : 'Subdomain created, DNS added, SSL attempted',
    });
  } catch (err) {
    console.error(err);
    console.error("Cloudflare Error:", err.response?.data?.errors || err.message);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});


// 🗑 DELETE Subdomain
app.post('/delete-subdomain', async (req, res) => {
  const { subdomain } = req.body;
  if (!subdomain) {
    return res.status(400).json({ error: 'Missing subdomain' });
  }

  const domain = `${subdomain}.${BASE_DOMAIN}`;
  const configPath = path.join(SITES_AVAILABLE, domain);
  const symlinkPath = path.join(SITES_ENABLED, domain);

  try {
    if (fs.existsSync(symlinkPath)) fs.unlinkSync(symlinkPath);
    if (fs.existsSync(configPath)) fs.unlinkSync(configPath);

    execSync('nginx -t');
    execSync('systemctl reload nginx');

    const cfList = await axios.get(
      `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/dns_records?name=${domain}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        },
      }
    );

    const record = cfList.data.result.find(r => r.name === domain);
    if (record) {
      await axios.delete(
        `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/dns_records/${record.id}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          },
        }
      );
    }

    return res.json({ status: 'success', domain, message: 'Subdomain deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Automation server running on port ${PORT}`);
});
