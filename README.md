# DRUMS Web Simple Version

Ứng dụng giám sát dữ liệu động cơ theo tàu, gồm frontend React/Vite và backend Flask. Dữ liệu giám sát được lấy từ MySQL; API lịch sử riêng hỗ trợ SQLite.

## Chức năng

- Đăng nhập bằng tài khoản lưu tại backend, phân quyền `admin` và `user`.
- Trang tổng quan `/`: chọn tàu, động cơ và hiển thị dữ liệu giám sát.
- Trang biểu đồ `/graph`: xem dữ liệu xu hướng. Các đường dẫn `/pressure_trend`, `/exh_temp_trend`, `/fo-consumption` và `/alarms` hiện cùng sử dụng thành phần `Graph`.
- Trang quản trị `/admin`: xem, tạo và xóa tài khoản.
- Trang cấu hình `/admin/config`: quản trị viên đọc và chỉnh sửa cấu hình backend.
- Đường dẫn `/engine` chuyển về trang tổng quan.

## Công nghệ và cấu trúc

Frontend sử dụng React 19, Vite 6, React Router, Material UI, Tailwind CSS, ECharts và Recharts. Backend sử dụng Flask, Flask-CORS và PyMySQL.

```text
frontend/
  src/
    pages/                 Các trang giao diện
    components/            Thành phần dùng chung
    services/              Hàm gọi API và quản lý phiên đăng nhập
    hooks/                 Hook cập nhật dữ liệu định kỳ
  Reference/               Ví dụ giao diện tham khảo
  package.json             Dependency và lệnh npm
  vite.config.mjs          Cấu hình Vite và proxy API
backend/
  app.py                   Điểm khởi chạy Flask
  auth_api.py              API đăng nhập và quản lý tài khoản
  auth_store.py            Lưu tài khoản và băm mật khẩu
  config_api.py            API chỉnh sửa cấu hình
  database_api_overview.py API cấu hình tàu và dữ liệu xu hướng
  database_api_engine.py   API dữ liệu động cơ
  backend_config.json      Cấu hình cơ sở dữ liệu, tàu và động cơ
  database/                users.json và cơ sở dữ liệu SQLite nếu sử dụng
  test_config_api.py       Kiểm thử API cấu hình
  requirements.txt         Dependency Python
reference/                 Mã giao diện tham khảo
```

## Chạy trên máy local

Yêu cầu Node.js **20 trở lên** theo `frontend/package.json`, npm, Python **3.10 trở lên** và quyền kết nối tới MySQL đã cấu hình. `frontend/.nvmrc` hiện chỉ định Node 20; nếu dùng nvm có thể chạy `nvm install` và `nvm use` trong thư mục `frontend`.

### 1. Kiểm tra cấu hình dữ liệu

Chỉnh [backend/backend_config.json](backend/backend_config.json) cho môi trường của bạn:

| Nhóm | Nội dung |
| --- | --- |
| `database_connection` | Host, port, user, password và timeout kết nối MySQL |
| `vessels` | Danh sách tàu, database, bảng dữ liệu, động cơ và ánh xạ SVG |
| `overview_trend` | Tên cột, khoảng thời gian và giới hạn dữ liệu biểu đồ |
| `history_trend` | Đường dẫn SQLite, bảng, cột và chuỗi dữ liệu mặc định |

Backend đọc file này lúc khởi động. Sau khi chỉnh sửa, cần khởi động lại backend. Thông tin kết nối MySQL hiện được đọc trực tiếp từ JSON, chưa có cơ chế ghi đè bằng biến môi trường.

Nếu dùng `/api/history/trend`, chuẩn bị SQLite theo [hướng dẫn schema](backend/database/README.md). Đường dẫn tương đối trong `history_trend.database_path` được tính từ thư mục `backend`. API này không tự tạo bảng hay dữ liệu mẫu.

### 2. Khởi động backend

Mở terminal tại thư mục gốc dự án.

**Windows PowerShell:**

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
$env:DRUMS_SECRET_KEY = (.\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_hex(32))")
.\.venv\Scripts\python.exe backend/app.py
```

**Linux/macOS:**

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
export DRUMS_SECRET_KEY="$(.venv/bin/python -c 'import secrets; print(secrets.token_hex(32))')"
.venv/bin/python backend/app.py
```

API truy cập tại `http://127.0.0.1:8001`. Lệnh `app.py` bật debug và lắng nghe trên `0.0.0.0`, chỉ dùng cho phát triển. Phần triển khai bên dưới dùng Gunicorn.

### 3. Khởi động frontend

Mở terminal thứ hai tại thư mục gốc:

```bash
cd frontend
npm ci
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal, mặc định là `http://localhost:5173`. `npm start` tương đương `npm run dev`. Vite chuyển tiếp `/api/*` tới `http://127.0.0.1:8001`.

### 4. Đăng nhập và quản lý tài khoản

Tài khoản được lưu trong `backend/database/users.json`, mật khẩu được băm. Dùng tài khoản đã có trong file của môi trường đang chạy.

Khi khởi tạo kho tài khoản mới, backend tạo tài khoản `admin` với mật khẩu từ biến môi trường `INITIAL_ADMIN_PASSWORD`; nếu không đặt thì mặc định là `admin123`. Đặt biến này **trước lần sử dụng kho tài khoản đầu tiên**. Biến này không đổi mật khẩu của tài khoản đã tồn tại trong một kho hợp lệ. Kho bị lỗi hoặc không còn admin hợp lệ cũng có thể bị khởi tạo lại theo logic trong `auth_store.py`.

Quản trị viên có thể tạo tài khoản mới ở `/admin`. Hệ thống không cho xóa tài khoản đang đăng nhập hoặc admin cuối cùng.

| Biến môi trường | Mục đích |
| --- | --- |
| `DRUMS_SECRET_KEY` | Khóa ký token đăng nhập; giữ cố định giữa các lần khởi động và dùng cùng giá trị cho các worker |
| `INITIAL_ADMIN_PASSWORD` | Mật khẩu admin khi khởi tạo kho tài khoản |

Nếu thiếu `DRUMS_SECRET_KEY`, backend sinh khóa ngẫu nhiên khi khởi động, khiến token cũ mất hiệu lực sau khi khởi động lại. Các lệnh local ở trên cũng sinh khóa mới mỗi lần chạy. Backend không tự nạp file `.env`; hãy đặt biến qua shell hoặc trình quản lý service.

### 5. Chỉnh sửa cấu hình từ giao diện

Đăng nhập bằng admin và mở **Configuration** (`/admin/config`). Khi lưu, API kiểm tra cấu trúc JSON và revision; nếu file đã thay đổi kể từ lúc tải, yêu cầu lưu bị từ chối với mã `409` và cần tải lại.

Sau khi lưu thành công, khởi động lại backend để áp dụng. Giao diện không tự khởi động lại service. Tài khoản hệ điều hành chạy backend cần quyền ghi file cấu hình **và thư mục `backend`**, vì thao tác lưu tạo file tạm rồi thay thế file gốc.

## API chính

| Phương thức | Đường dẫn | Chức năng |
| --- | --- | --- |
| `POST` | `/api/login` | Đăng nhập, trả token và thông tin người dùng |
| `GET`, `POST` | `/api/users` | Liệt kê hoặc tạo tài khoản; yêu cầu admin |
| `DELETE` | `/api/users/<username>` | Xóa tài khoản; yêu cầu admin |
| `GET`, `PUT` | `/api/admin/backend-config` | Đọc hoặc lưu cấu hình; yêu cầu admin |
| `GET` | `/api/vessels/config` | Cấu hình tàu và động cơ |
| `GET` | `/api/overview/config` | Cấu hình biểu đồ tổng quan |
| `GET` | `/api/overview/channel-options` | Danh sách kênh dữ liệu |
| `GET` | `/api/overview/trend` | Dữ liệu xu hướng từ MySQL |
| `GET` | `/api/engine` | Dữ liệu giám sát động cơ |
| `GET` | `/api/history/trend` | Dữ liệu lịch sử từ SQLite |

Các API yêu cầu admin nhận header `Authorization: Bearer <token>`. Các API dữ liệu hiện chưa được bảo vệ bằng kiểm tra token ở backend; màn hình đăng nhập frontend không thay thế kiểm soát truy cập API.

## Build và kiểm tra

Build frontend:

```bash
cd frontend
npm ci
npm run build
```

Kết quả nằm trong `frontend/dist`. `npm run preview` dùng để xem bản build; proxy API hiện chỉ được khai báo cho development server, nên cần kiểm tra cấu hình proxy khi xem preview.

Chạy bộ kiểm thử API cấu hình từ thư mục gốc:

```bash
python -m unittest discover -s backend -p "test_*.py" -v
```

Dùng Python trong `.venv` đã cài dependency (hoặc kích hoạt môi trường trước). Kiểm tra endpoint cấu hình khi backend đang chạy:

```bash
curl http://127.0.0.1:8001/api/overview/config
```

Endpoint cấu hình trả JSON không đồng nghĩa với việc kết nối MySQL thành công; cần mở trang giám sát hoặc gọi API dữ liệu để kiểm tra kết nối thực tế.

## Triển khai trên VPS Ubuntu với Apache

Ví dụ bên dưới thống nhất thư mục `/var/www/drums-web` và domain `drums.dqtech.cloud`. Thay domain bằng tên miền của bạn ở DNS, VirtualHost, lệnh Certbot và lệnh kiểm tra.

```text
Internet → Apache :80/:443
             ├─ /       → frontend/dist
             └─ /api/*  → Gunicorn/Flask tại 127.0.0.1:8001
                            └─ MySQL / SQLite / users.json
```

### 1. Chuẩn bị

Trỏ bản ghi DNS `A` của domain về IP VPS. Cài Node.js đáp ứng yêu cầu ở trên, sau đó cài các gói hệ thống:

```bash
sudo apt update
sudo apt install -y apache2 python3 python3-venv python3-pip git certbot python3-certbot-apache
```

Nếu dùng firewall, cho phép SSH và HTTP/HTTPS. Không cần mở cổng backend `8001` ra Internet.

Đưa source vào thư mục triển khai:

```bash
sudo mkdir -p /var/www/drums-web
sudo chown "$USER:$(id -gn)" /var/www/drums-web
git clone <YOUR_GIT_REPO_URL> /var/www/drums-web
cd /var/www/drums-web/frontend
npm ci
npm run build
cd ..
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
.venv/bin/python -m pip install gunicorn
```

Gunicorn được cài riêng cho triển khai Linux, chưa nằm trong `backend/requirements.txt`.

### 2. Cấu hình và quyền truy cập

Kiểm tra `backend/backend_config.json`, kết nối MySQL và kho tài khoản trước khi chạy service. Sao lưu `backend_config.json`, `database/users.json` và SQLite nếu có trước khi cập nhật hoặc thay source. Không đưa mật khẩu kết nối thực tế vào tài liệu hay repository công khai.

Cho service quyền đọc source, quyền ghi kho tài khoản và quyền lưu cấu hình:

```bash
sudo chgrp www-data /var/www/drums-web/backend
sudo chmod g+rwx /var/www/drums-web/backend
sudo chgrp www-data /var/www/drums-web/backend/backend_config.json
sudo chmod 660 /var/www/drums-web/backend/backend_config.json
sudo chown -R www-data:www-data /var/www/drums-web/backend/database
sudo chmod 750 /var/www/drums-web/backend/database
sudo chmod 600 /var/www/drums-web/backend/database/users.json
```

Tạo `/etc/drums-backend.env` bằng `sudo nano /etc/drums-backend.env`:

```ini
DRUMS_SECRET_KEY=<RANDOM_SECRET>
INITIAL_ADMIN_PASSWORD=<STRONG_INITIAL_PASSWORD>
```

Thay các giá trị placeholder; có thể tạo khóa bằng `.venv/bin/python -c "import secrets; print(secrets.token_hex(32))"`. Giữ nguyên khóa qua các lần restart. Nếu `users.json` đã có tài khoản hợp lệ, thiết lập mật khẩu khởi tạo không thay đổi các tài khoản đó.

```bash
sudo chmod 600 /etc/drums-backend.env
```

### 3. Service backend

Tạo `/etc/systemd/system/drums-backend.service`:

```ini
[Unit]
Description=DRUMS Flask Backend
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/drums-web/backend
Environment="PYTHONUNBUFFERED=1"
EnvironmentFile=/etc/drums-backend.env
ExecStart=/var/www/drums-web/.venv/bin/gunicorn --workers 1 --bind 127.0.0.1:8001 app:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Ví dụ dùng một worker vì tài khoản lưu trong JSON và khóa ghi cấu hình chỉ có hiệu lực trong một tiến trình. Cần đánh giá lại cơ chế lưu và đồng bộ trước khi tăng worker.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now drums-backend
sudo systemctl status drums-backend
curl http://127.0.0.1:8001/api/overview/config
```

### 4. Apache và HTTPS

```bash
sudo a2enmod proxy proxy_http rewrite
sudo nano /etc/apache2/sites-available/drums.dqtech.cloud.conf
```

Nội dung VirtualHost:

```apache
<VirtualHost *:80>
    ServerName drums.dqtech.cloud
    DocumentRoot /var/www/drums-web/frontend/dist

    ProxyPreserveHost On
    ProxyPass /api/ http://127.0.0.1:8001/api/
    ProxyPassReverse /api/ http://127.0.0.1:8001/api/

    <Directory /var/www/drums-web/frontend/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted

        RewriteEngine On
        RewriteBase /
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule ^ index.html [L]
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/drums-error.log
    CustomLog ${APACHE_LOG_DIR}/drums-access.log combined
</VirtualHost>
```

Rule rewrite cho phép tải trực tiếp các route React như `/graph` hoặc `/admin/config`. Apache cần quyền đọc bản build và đi qua các thư mục cha.

```bash
sudo a2ensite drums.dqtech.cloud.conf
sudo apache2ctl configtest
sudo systemctl reload apache2
sudo certbot --apache -d drums.dqtech.cloud
sudo certbot renew --dry-run
```

Sau khi DNS và HTTPS hoạt động:

```bash
curl -I https://drums.dqtech.cloud
curl https://drums.dqtech.cloud/api/overview/config
```

Mở website, đăng nhập và kiểm tra dữ liệu cho từng tàu/động cơ.

### 5. Cập nhật phiên bản

Sao lưu cấu hình và dữ liệu tài khoản trước khi cập nhật. Nếu cấu hình được chỉnh từ giao diện, kiểm tra thay đổi local trước khi `git pull` và xử lý xung đột nếu có.

```bash
cd /var/www/drums-web
git pull
cd frontend
npm ci
npm run build
cd ..
.venv/bin/python -m pip install -r backend/requirements.txt
sudo systemctl restart drums-backend
sudo apache2ctl configtest
sudo systemctl reload apache2
```

## Xử lý sự cố

| Hiện tượng | Kiểm tra |
| --- | --- |
| Frontend báo lỗi kết nối API | Backend đã chạy ở cổng 8001; proxy Vite hoặc Apache đúng địa chỉ |
| Giao diện có nhưng không có dữ liệu | Host/port MySQL, quyền truy cập, database/bảng/cột và serial động cơ trong cấu hình |
| API lịch sử SQLite lỗi | File database tồn tại và có schema đúng với `history_trend` |
| Token mất hiệu lực sau restart | `DRUMS_SECRET_KEY` có được giữ cố định hay không |
| Lưu cấu hình trả `409` | Tải lại cấu hình mới nhất rồi thực hiện lại thay đổi |
| Lưu cấu hình hoặc tài khoản lỗi quyền | Quyền ghi thư mục `backend`, file cấu hình và `backend/database` của user chạy service |
| F5 tại `/graph` bị 404 | Module rewrite, Directory và rule fallback về `index.html` |
| Apache trả `502` hoặc `503` | Trạng thái Gunicorn và cổng backend |

Xem log trên VPS:

```bash
sudo journalctl -u drums-backend -n 200 --no-pager
sudo tail -n 100 /var/log/apache2/drums-error.log
```


## L?u c?u h?nh v? t? kh?i ??ng l?i backend

Admin m? **Edit backend configuration** ? `/admin`, s? d?ng phi?n hi?n t?i.
**Save and restart backend** l?u file tr??c, sau ?? h?n systemd th?c hi?n
`systemctl restart drums-backend.service` sau 3 gi?y. N?u kh?ng h?n ???c restart,
giao di?n b?o r? file ?? l?u nh?ng c?n kh?i ??ng l?i th? c?ng; c? th? b?m l?i ?? th?.

Tr?n VPS, d?ng `sudo visudo -f /etc/sudoers.d/drums-backend-restart` v? th?m ??ng l?nh:

```sudoers
www-data ALL=(root) NOPASSWD: /usr/bin/systemd-run --on-active=3s /usr/bin/systemctl restart drums-backend.service
```

Thay `www-data` b?ng user ch?y service n?u kh?c. C?n c? systemd v? c?c executable
? ??ng ???ng d?n tr?n. Quy?n n?y ch? d?nh cho l?nh c? ??nh c?a d?ch v? n?y.
Gi? nguy?n `DRUMS_SECRET_KEY` ?? tri?n khai ?? phi?n hi?n t?i ti?p t?c h?p l?.
N?u tr??c ??y d?ng kh?a ng?u nhi?n trong b? nh?, c?c phi?n c? c?n ??ng nh?p l?i
m?t l?n khi tri?n khai thay ??i n?y; c?c l?n restart sau s? gi? phi?n.
