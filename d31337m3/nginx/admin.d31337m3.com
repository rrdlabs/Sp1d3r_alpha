upstream admin-cityhall { server 127.0.0.1:8000; }
upstream admin-historian { server 127.0.0.1:8100; }
upstream admin-lawyer { server 127.0.0.1:8200; }
upstream admin-inboxer { server 127.0.0.1:8300; }
upstream admin-director { server 127.0.0.1:8400; }
upstream admin-picaso { server 127.0.0.1:8500; }
upstream admin-spiderwire { server 127.0.0.1:8600; }
upstream admin-banker { server 127.0.0.1:8700; }
upstream admin-sp1d3r { server 127.0.0.1:9000; }

server {
    listen 80;
    listen [::]:80;
    server_name admin.d31337m3.com;

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
    server_name admin.d31337m3.com;

    root /var/www/mobile-admin.d31337m3.com;
    index index.html;

    ssl_certificate /etc/letsencrypt/live/admin.d31337m3.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.d31337m3.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Content-Type-Options nosniff;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /api/ { proxy_pass http://admin-cityhall/; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
    location /cityhall/ { proxy_pass http://admin-cityhall/; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
    location /historian/ { proxy_pass http://admin-historian/; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
    location /lawyer/ { proxy_pass http://admin-lawyer/; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
    location /inboxer/ { proxy_pass http://admin-inboxer/; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
    location /director/ { proxy_pass http://admin-director/; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
    location /picaso/ { proxy_pass http://admin-picaso/; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
    location /spiderwire/ { proxy_pass http://admin-spiderwire/; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
    location /banker/ { proxy_pass http://admin-banker/; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
    location /sp1d3r/ { proxy_pass http://admin-sp1d3r/; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }

    location / {
        try_files $uri $uri/ /index.html;
    }

    server_tokens off;
}
