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
  const port = req.headers['x-app-port'] || 'unknown';
  const domain = req.headers['x-app-domain'] || 'unknown';
  

  res.send(`
 <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>502 Bad Gateway - HTD Hosting</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏠</text></svg>">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        html {
            overflow-y: scroll;
            scrollbar-width: thin;
            scrollbar-color: #475569 #1e293b;
        }

        html::-webkit-scrollbar {
            width: 8px;
        }

        html::-webkit-scrollbar-track {
            background: #1e293b;
        }

        html::-webkit-scrollbar-thumb {
            background: #475569;
            border-radius: 4px;
        }

        html::-webkit-scrollbar-thumb:hover {
            background: #64748b;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #ffffff;
            min-height: 100vh;
            padding: 40px 20px;
            line-height: 1.6;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
            position: relative;
        }

        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 2px solid #334155;
        }

        .htd-logo {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 30px;
            padding: 16px 32px;
            background: #1e293b;
            border: 2px solid #3b82f6;
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(59, 130, 246, 0.2);
        }

        .htd-logo-icon {
            font-size: 24px;
        }

        .htd-logo-text {
            font-size: 20px;
            font-weight: 800;
            color: #3b82f6;
            letter-spacing: 1px;
        }

        .error-section {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 30px;
            margin-bottom: 30px;
        }

        .error-code {
            font-size: 80px;
            font-weight: 900;
            color: #ef4444;
            text-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
            min-width: 160px;
        }

        .error-info {
            text-align: left;
            max-width: 400px;
        }

        .error-title {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 12px;
            color: #ffffff;
        }

        .error-subtitle {
            font-size: 18px;
            color: #94a3b8;
            font-weight: 500;
        }

        .main-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin: 40px 0;
        }

        .card {
            background: #1e293b;
            border: 2px solid #334155;
            border-radius: 12px;
            padding: 30px;
            transition: border-color 0.2s ease;
        }

        .card:hover {
            border-color: #3b82f6;
        }

        .card-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
        }

        .card-icon {
            font-size: 24px;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #334155;
            border-radius: 8px;
        }

        .card-title {
            font-size: 20px;
            font-weight: 700;
            color: #ffffff;
        }

        .card-content {
            color: #cbd5e1;
            font-size: 16px;
            line-height: 1.6;
        }

        .deployment-info {
            background: #1e293b;
            border: 2px solid #10b981;
            border-radius: 12px;
            padding: 30px;
            margin: 30px 0;
        }

        .deployment-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 1px solid #334155;
        }

        .deployment-title {
            font-size: 20px;
            font-weight: 700;
            color: #10b981;
        }

        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }

        .info-item {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .info-label {
            font-size: 14px;
            color: #94a3b8;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .info-value {
            font-size: 16px;
            color: #10b981;
            font-family: 'Monaco', 'Menlo', monospace;
            font-weight: 600;
            background: rgba(16, 185, 129, 0.1);
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .troubleshooting {
            background: #1e293b;
            border: 2px solid #f59e0b;
            border-radius: 12px;
            padding: 30px;
            margin: 30px 0;
        }

        .troubleshooting-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 1px solid #334155;
        }

        .troubleshooting-title {
            font-size: 20px;
            font-weight: 700;
            color: #f59e0b;
        }

        .steps-list {
            list-style: none;
            counter-reset: step-counter;
        }

        .step-item {
            counter-increment: step-counter;
            margin-bottom: 16px;
            padding-left: 50px;
            position: relative;
            color: #cbd5e1;
            font-size: 16px;
        }

        .step-item::before {
            content: counter(step-counter);
            position: absolute;
            left: 0;
            top: 0;
            width: 32px;
            height: 32px;
            background: #f59e0b;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 700;
            color: #000;
        }

        .step-item code {
            background: #334155;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', monospace;
            color: #3b82f6;
        }

        .actions {
            display: flex;
            gap: 20px;
            justify-content: center;
            margin: 40px 0;
            flex-wrap: wrap;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 16px 24px;
            border-radius: 8px;
            font-weight: 700;
            text-decoration: none;
            transition: all 0.2s ease;
            border: 2px solid transparent;
            cursor: pointer;
            font-size: 16px;
            min-width: 160px;
            justify-content: center;
        }

        .btn-primary {
            background: #3b82f6;
            color: white;
            border-color: #3b82f6;
        }

        .btn-primary:hover {
            background: #2563eb;
            border-color: #2563eb;
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
        }

        .btn-secondary {
            background: transparent;
            color: #cbd5e1;
            border-color: #475569;
        }

        .btn-secondary:hover {
            background: #334155;
            border-color: #64748b;
            color: #ffffff;
        }

        .status-bar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #0f172a;
            border-bottom: 2px solid #334155;
            padding: 12px 20px;
            z-index: 1000;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
        }

        .status-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .status-indicator {
            width: 12px;
            height: 12px;
            background: #ef4444;
            border-radius: 50%;
            animation: pulse-status 2s infinite;
        }

        @keyframes pulse-status {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .status-text {
            color: #94a3b8;
            font-weight: 600;
        }

        .countdown-text {
            color: #3b82f6;
            font-weight: 600;
        }

        .footer {
            text-align: center;
            padding: 40px 0;
            border-top: 2px solid #334155;
            margin-top: 50px;
        }

        .footer-content {
            color: #94a3b8;
            font-size: 16px;
            margin-bottom: 20px;
        }

        .htd-branding {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-size: 16px;
            font-weight: 600;
        }

        .htd-branding a {
            color: #10b981;
            text-decoration: none;
            transition: color 0.2s ease;
        }

        .htd-branding a:hover {
            color: #3b82f6;
        }

        body {
            padding-top: 60px;
        }

        @media (max-width: 768px) {
            .main-grid {
                grid-template-columns: 1fr;
                gap: 20px;
            }
            
            .info-grid {
                grid-template-columns: 1fr;
            }
            
            .error-section {
                flex-direction: column;
                gap: 20px;
                text-align: center;
            }
            
            .error-info {
                text-align: center;
                max-width: none;
            }
            
            .error-code {
                font-size: 60px;
                min-width: auto;
            }
            
            .error-title {
                font-size: 24px;
            }
            
            .actions {
                flex-direction: column;
                align-items: center;
            }
            
            .btn {
                width: 100%;
                max-width: 300px;
            }

            .status-bar {
                flex-direction: column;
                gap: 8px;
                padding: 8px 20px;
            }

            body {
                padding-top: 80px;
            }
        }
    </style>
</head>
<body>
    <div class="status-bar">
        <div class="status-left">
            <div class="status-indicator"></div>
            <span class="status-text">Service Unavailable</span>
        </div>
    </div>

    <div class="container">
        <div class="header">
            
            <div class="error-section">
                <div class="error-code">502</div>
                <div class="error-info">
                    <h1 class="error-title">Bad Gateway</h1>
                    <p class="error-subtitle">Application server is not responding on the assigned port</p>
                </div>
            </div>
        </div>

        <div class="main-grid">
            <div class="card">
                <div class="card-header">
                    <div class="card-icon">⚡</div>
                    <h3 class="card-title">Current Status</h3>
                </div>
                <div class="card-content">
                    Your server container is running successfully, but the application inside is not listening on the expected port. This typically occurs during startup, dependency installation, or configuration loading.
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-icon">🔧</div>
                    <h3 class="card-title">Expected Resolution</h3>
                </div>
                <div class="card-content">
                    Most applications resolve this automatically within 2-5 minutes. HTD continuously monitors your service and will restore connectivity once your application starts listening on the configured port.
                </div>
            </div>
        </div>

        <div class="deployment-info">
            <div class="deployment-header">
                <div class="card-icon">📊</div>
                <h3 class="deployment-title">Deployment Information</h3>
            </div>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Domain</div>
                    <div class="info-value">${domain}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Port</div>
                    <div class="info-value">${port}</div>
                </div>
            </div>
        </div>

        <div class="troubleshooting">
            <div class="troubleshooting-header">
                <div class="card-icon">🔍</div>
                <h3 class="troubleshooting-title">Troubleshooting Steps (Site Owner)</h3>
            </div>
            <ol class="steps-list">
                <li class="step-item">Verify your application listens on port <code>${port}</code> and binds to <code>0.0.0.0</code></li>
                <li class="step-item">Check application logs for startup errors or missing dependencies</li>
                <li class="step-item">Ensure environment variables and configuration files are correct</li>
                <li class="step-item">Confirm database connections and external service dependencies</li>
                <li class="step-item">Review deployment settings and restart the application if needed</li>
            </ol>
        </div>

        <div class="footer">
            <div class="footer-content">
                HTD provides 24/7 monitoring and automatic recovery for your applications
            </div>
            <div class="htd-branding">
                <span>⚡ Hosted on</span>
                <a href="https://host.talkdrove.com" target="_blank">HTD</a>
            </div>
        </div>
    </div>
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
        proxy_pass http://localhost:4000;
        rewrite ^ /error-502 break;
    proxy_set_header X-App-Port "${port}";
    proxy_set_header X-App-Domain "${domain}";
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
