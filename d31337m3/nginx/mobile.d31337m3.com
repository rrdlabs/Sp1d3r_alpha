server {
    listen 80;
    listen [::]:80;
    server_name m.d31337m3.com;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name m.d31337m3.com;

    root /var/www/mobile.d31337m3.com;
    index index.html;

    ssl_certificate /etc/letsencrypt/live/m.d31337m3.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/m.d31337m3.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Content-Type-Options nosniff;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    server_tokens off;
}
