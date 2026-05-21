# HMI Starter Template

Template này được tách ra từ project `HMI` hiện tại để bạn dùng làm điểm khởi đầu cho các dự án web UI + backend mới.

## Mục tiêu của template

- Giữ lại khung `React + Vite` ở frontend
- Giữ lại khung `Flask` ở backend
- Giữ lại mô hình `frontend gọi /api/*`
- Giữ lại polling live data và một màn hình trend lịch sử
- Loại bỏ toàn bộ logic, asset, database và cấu hình đặc thù của dự án DRUMS

## Cấu trúc

```text
hmi-template-starter/
  backend/
    app.py
    modbus_api.py
    database_api.py
    backend_config.json
    requirements.txt
    database/
      .gitkeep
      README.md

  public/
    diagram-template.svg

  src/
    components/
    hooks/
    pages/
    services/
    App.jsx
    global.css
    index.jsx
    reportWebVitals.jsx

  index.html
  package.json
  vite.config.mjs
```

## Những gì mình đã giữ lại

- Router nhiều trang
- App shell có sidebar + header
- Hook polling dùng cho live pages
- Generic API client cho `/api/<page>` và `/api/history/trend`
- Flask blueprint cho live Modbus-style payload
- Flask endpoint cho historical trend từ SQLite
- File config backend tập trung trong `backend/backend_config.json`

## Những gì mình đã loại bỏ khỏi template

- `node_modules`
- `__pycache__`
- database thật và dữ liệu mock cũ
- ảnh/logo/sơ đồ đặc thù DRUMS
- page/component có tên theo nghiệp vụ riêng
- file backup như `bak`, `BAk`

## Cách dùng

### 1. Tạo project mới từ template này

Copy folder `hmi-template-starter` sang project mới, rồi đổi tên folder theo dự án của bạn.

### 2. Cài frontend

```bash
npm install
```

### 3. Cài backend

```bash
pip install -r backend/requirements.txt
```

### 4. Chạy backend

```bash
python backend/app.py
```

Backend mặc định chạy tại `http://127.0.0.1:8001`.

### 5. Chạy frontend

```bash
npm run start
```

Frontend mặc định chạy tại `http://localhost:5173`.

## Các file bạn nên sửa đầu tiên khi dùng cho dự án mới

### Frontend

- `src/App.jsx`: route của dự án mới
- `src/components/AppShell.jsx`: menu trái, tên hệ thống
- `src/pages/*`: thay page mẫu bằng page thật
- `public/diagram-template.svg`: thay bằng sơ đồ mới nếu có

### Backend

- `backend/backend_config.json`
  - `modbus.host`, `port`, `unit_id`
  - `pages.*` để map dữ liệu live
  - `history_trend.*` để map dữ liệu lịch sử
- `backend/database_api.py`: nếu logic historical phức tạp hơn
- `backend/modbus_api.py`: nếu cần thêm rule transform riêng

## Shape dữ liệu frontend đang mong đợi

### Live page

`GET /api/overview`, `GET /api/live-metrics`, `GET /api/diagram`

Response:

```json
{
  "page": "overview",
  "sections": {
    "heroMetrics": [
      {
        "key": "line_speed",
        "label": "Line Speed",
        "unit": "m/min",
        "value": 82,
        "state": "normal"
      }
    ]
  },
  "meta": {
    "host": "127.0.0.1",
    "port": 502,
    "unitId": 1,
    "pollIntervalMs": 2000
  }
}
```

### Historical trend

`GET /api/history/trend`

Response:

```json
{
  "page": "history-trend",
  "records": [
    {
      "seriesKey": "line_speed",
      "seriesLabel": "Line Speed",
      "timestampMs": 1710000000000,
      "timestampLabel": "2026-05-20 10:00:00",
      "value": 81.5,
      "unit": "m/min"
    }
  ],
  "meta": {
    "rangeStartMs": 1710000000000,
    "rangeEndMs": 1710003600000,
    "series": [
      {
        "key": "line_speed",
        "label": "Line Speed",
        "unit": "m/min"
      }
    ]
  }
}
```

## Gợi ý workflow cho dự án sau

1. Dùng template này để dựng khung dự án mới.
2. Sửa `backend_config.json` trước để backend trả đúng shape.
3. Tạo page thật từ các page mẫu.
4. Sau khi route ổn, thay asset và chart theo nghiệp vụ.
5. Cuối cùng mới thêm logic đặc thù cho PLC/DB thật.
