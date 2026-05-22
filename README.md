# DRUMS Web Simple Version

README này hướng dẫn deploy project lên VPS Ubuntu với:

- Frontend React/Vite build ra thư mục `dist`
- Backend Flask chạy như service `systemd`
- Apache2 serve domain `drums.dqcloud.online`
- Apache reverse proxy `/api/*` sang backend tại `127.0.0.1:8001`
- HTTPS bằng Let's Encrypt

## 1. Kiến trúc deploy

Production sẽ chạy theo mô hình:

```text
Internet
  -> Apache2 :80 / :443
     -> /            serve file tĩnh từ dist/
     -> /api/*       proxy tới Flask backend tại 127.0.0.1:8001

Flask backend
  -> đọc backend/backend_config.json
  -> query MySQL remote
```

Frontend trong project đang gọi API theo đường dẫn tương đối `/api/...`, nên production cần giữ đúng rule này.

## 2. Chuẩn bị VPS

Ví dụ dùng Ubuntu 22.04 hoặc 24.04.

Trên VPS, cập nhật hệ thống:

```bash
sudo apt update
sudo apt upgrade -y
```

Cài package cần thiết:

```bash
sudo apt install -y apache2 python3 python3-venv python3-pip git certbot python3-certbot-apache
```

Nếu có bật firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Apache Full'
sudo ufw enable
```

## 3. Trỏ domain

Tại nơi quản lý DNS của domain `dqcloud.online`, tạo bản ghi:

- Type: `A`
- Name: `drums`
- Value: `IP public của VPS`

Sau đó kiểm tra:

```bash
nslookup drums.dqcloud.online
```

Phải ra đúng IP của VPS trước khi xin SSL.

## 4. Clone source lên VPS

Ví dụ deploy vào:

```bash
sudo mkdir -p /var/www
cd /var/www
sudo git clone <YOUR_GIT_REPO_URL> drums-web
sudo chown -R $USER:$USER /var/www/drums-web
cd /var/www/drums-web
```

Nếu source được copy thủ công thay vì `git clone`, vẫn nên đặt project tại:

```text
/var/www/drums-web
```

## 5. Build frontend

Cài Node.js nếu VPS chưa có. Khuyến nghị Node 20 LTS:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Kiểm tra version:

```bash
node -v
npm -v
```

Build frontend:

```bash
cd /var/www/drums-web
npm install
npm run build
```

Sau khi build xong, frontend production nằm trong:

```text
/var/www/drums-web/dist
```

## 6. Cấu hình backend Flask

Tạo virtual environment và cài dependency:

```bash
cd /var/www/drums-web
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt
deactivate
```

Project hiện đọc config từ file:

```text
backend/backend_config.json
```

Trước khi chạy production, kiểm tra lại:

- `database_connection.host`
- `database_connection.port`
- `database_connection.user`
- `database_connection.password`
- tên database/table trong `overview_trend`

Lưu ý: file này đang chứa thông tin DB thật. Nếu repo public, nên chuyển secret ra biến môi trường hoặc file private ngoài git.

## 7. Tạo systemd service cho backend

Tạo file service:

```bash
sudo nano /etc/systemd/system/drums-backend.service
```

Nội dung:

```ini
[Unit]
Description=DRUMS Flask Backend
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/drums-web/backend
Environment="PYTHONUNBUFFERED=1"
ExecStart=/var/www/drums-web/.venv/bin/python /var/www/drums-web/backend/app.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Nạp lại `systemd` và bật service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable drums-backend
sudo systemctl start drums-backend
```

Kiểm tra trạng thái:

```bash
sudo systemctl status drums-backend
```

Xem log realtime:

```bash
sudo journalctl -u drums-backend -f
```

Test backend local trên VPS:

```bash
curl http://127.0.0.1:8001/api/overview/config
```

Nếu backend chạy đúng, lệnh trên phải trả JSON.

## 8. Bật module Apache cần thiết

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod rewrite
sudo a2enmod headers
```

## 9. Tạo VirtualHost Apache2 cho drums.dqcloud.online

Tạo file:

```bash
sudo nano /etc/apache2/sites-available/drums.dqcloud.online.conf
```

Nội dung:

```apache
<VirtualHost *:80>
    ServerName drums.dqcloud.online
    ServerAdmin admin@dqcloud.online

    DocumentRoot /var/www/drums-web/dist

    <Directory /var/www/drums-web/dist>
        Options Indexes FollowSymLinks
        AllowOverride None
        Require all granted

        RewriteEngine On
        RewriteBase /

        RewriteCond %{REQUEST_FILENAME} -f [OR]
        RewriteCond %{REQUEST_FILENAME} -d
        RewriteRule ^ - [L]

        RewriteRule ^ index.html [L]
    </Directory>

    ProxyPreserveHost On
    ProxyPass /api http://127.0.0.1:8001/api
    ProxyPassReverse /api http://127.0.0.1:8001/api

    ErrorLog ${APACHE_LOG_DIR}/drums-error.log
    CustomLog ${APACHE_LOG_DIR}/drums-access.log combined
</VirtualHost>
```

Giải thích nhanh:

- `DocumentRoot` trỏ vào `dist/` sau khi build Vite
- `RewriteRule` giúp React Router không bị `404` khi F5 ở route như `/engine`
- `ProxyPass /api ...` để frontend vẫn gọi cùng domain

Enable site:

```bash
sudo a2ensite drums.dqcloud.online.conf
sudo apache2ctl configtest
sudo systemctl reload apache2
```

Tắt site default nếu không cần:

```bash
sudo a2dissite 000-default.conf
sudo systemctl reload apache2
```

## 10. Cấp SSL bằng Let's Encrypt

Sau khi domain đã trỏ đúng IP và Apache site đã hoạt động:

```bash
sudo certbot --apache -d drums.dqcloud.online
```

Chọn option tự redirect HTTP sang HTTPS khi được hỏi.

Test auto renew:

```bash
sudo certbot renew --dry-run
```

## 11. Kiểm tra sau deploy

Mở:

```text
https://drums.dqcloud.online
```

Test thêm:

```bash
curl -I https://drums.dqcloud.online
curl https://drums.dqcloud.online/api/overview/config
```

Nếu frontend lên nhưng không có data:

1. Kiểm tra service backend:

```bash
sudo systemctl status drums-backend
```

2. Kiểm tra log backend:

```bash
sudo journalctl -u drums-backend -n 200 --no-pager
```

3. Kiểm tra log Apache:

```bash
sudo tail -f /var/log/apache2/drums-error.log
sudo tail -f /var/log/apache2/drums-access.log
```

4. Test backend local:

```bash
curl http://127.0.0.1:8001/api/overview/config
```

## 12. Quy trình update sau này

Mỗi lần update code:

```bash
cd /var/www/drums-web
git pull
npm install
npm run build
source .venv/bin/activate
pip install -r backend/requirements.txt
deactivate
sudo systemctl restart drums-backend
sudo systemctl reload apache2
```

## 13. Gợi ý hardening

Nên làm thêm cho production:

- Tạo user deploy riêng thay vì dùng user mặc định
- Không để password DB thật trong git
- Giới hạn inbound port, chỉ mở `22`, `80`, `443`
- Nếu backend nặng hơn, chuyển từ `python app.py` sang `gunicorn`
- Bật monitoring cơ bản cho Apache và systemd service

## 14. Nếu muốn dùng Gunicorn tốt hơn cho production

Hiện tại README ưu tiên cách setup đơn giản nhất để chạy nhanh. Nếu muốn ổn định hơn, có thể đổi backend sang Gunicorn:

```bash
source /var/www/drums-web/.venv/bin/activate
pip install gunicorn
deactivate
```

Ví dụ `ExecStart`:

```ini
ExecStart=/var/www/drums-web/.venv/bin/gunicorn --bind 127.0.0.1:8001 app:app
```

Khi dùng dòng này:

- `WorkingDirectory` vẫn là `/var/www/drums-web/backend`
- file Flask object là `app` trong `backend/app.py`

## 15. File quan trọng trong project

- [backend/app.py](/C:/Users/DAIKAI%20VR/Desktop/DRUMS_Web_simple_version/backend/app.py)
- [backend/backend_config.json](/C:/Users/DAIKAI%20VR/Desktop/DRUMS_Web_simple_version/backend/backend_config.json)
- [backend/requirements.txt](/C:/Users/DAIKAI%20VR/Desktop/DRUMS_Web_simple_version/backend/requirements.txt)
- [vite.config.mjs](/C:/Users/DAIKAI%20VR/Desktop/DRUMS_Web_simple_version/vite.config.mjs)

Nếu bạn muốn, bước tiếp theo mình có thể tạo luôn:

1. file `drums-backend.service` trong repo
2. file sample Apache vhost trong repo
3. bản README ngắn hơn chỉ giữ đúng các lệnh cần copy-paste
