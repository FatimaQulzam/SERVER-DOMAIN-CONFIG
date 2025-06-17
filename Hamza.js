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

// ✅ Ensure nginx and certbot installed
function ensureDependency(cmd, installCmd) {
  try {
    execSync(`which ${cmd}`);
  } catch {
    console.log(`🔧 Installing ${cmd}...`);
    execSync(`apt update && apt install -y ${installCmd}`);
  }
}

// 🔧 CREATE Subdomain with SSL & DNS
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
    }
}
`;

  try {
    // 🛠 Ensure nginx & certbot installed
    ensureDependency('nginx', 'nginx');
    ensureDependency('certbot', 'certbot python3-certbot-nginx');

    // Ensure nginx folders
    if (!fs.existsSync(SITES_AVAILABLE)) fs.mkdirSync(SITES_AVAILABLE, { recursive: true });
    if (!fs.existsSync(SITES_ENABLED)) fs.mkdirSync(SITES_ENABLED, { recursive: true });

    // Create config + symlink
    fs.writeFileSync(configPath, config);
    if (!fs.existsSync(symlinkPath)) fs.symlinkSync(configPath, symlinkPath);

    execSync('nginx -t');
    execSync('systemctl reload nginx');

    // 🌩️ Add DNS to Cloudflare (gray cloud)
    const cfRes = await axios.post(
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

    if (!cfRes.data.success) {
      return res.status(500).json({ error: 'Cloudflare DNS failed', detail: cfRes.data });
    }

    console.log("⏳ Waiting 30 seconds for DNS propagation...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    // 🔒 Generate SSL with Certbot
    try {
      execSync(`certbot --nginx --non-interactive --agree-tos -d ${domain} -m admin@${BASE_DOMAIN}`);
    } catch (sslErr) {
      console.warn(`⚠️ SSL generation failed for ${domain}:`, sslErr.message);
    }

    return res.json({
      status: 'success',
      domain,
      message: 'Subdomain created, DNS added, SSL attempted',
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// 🗑️ DELETE Subdomain + DNS
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

    // Delete DNS record
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

    return res.json({ status: 'success', domain, message: 'Subdomain + DNS deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`⚙️ Automation server running on port ${PORT}`);
});
