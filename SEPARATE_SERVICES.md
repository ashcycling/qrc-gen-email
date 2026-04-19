# QRC Email Generator - Separate Frontend & Backend

This project now runs frontend and backend as separate Go applications.

## Architecture

- **Backend** (`cmd/backend/`): Runs on port 8080
  - Provides REST API endpoints (`/api/process`, `/api/qrcode`)
  - Handles QR code generation
  
- **Frontend** (`cmd/frontend/`): Runs on port 3000
  - Serves HTML, CSS, JavaScript static files
  - Proxies API requests to the backend

## Building

### Build Backend
```bash
go build -o cmd/backend/backend ./cmd/backend
```

### Build Frontend
```bash
go build -o cmd/frontend/frontend ./cmd/frontend
```

### Build Both
```bash
go build -o cmd/backend/backend ./cmd/backend && go build -o cmd/frontend/frontend ./cmd/frontend
```

## Running

### Terminal 1 - Start Backend API Server
```bash
./cmd/backend/backend
```
Backend will be available at `http://localhost:8080`

### Terminal 2 - Start Frontend Server
```bash
./cmd/frontend/frontend -port :3000 -backend http://localhost:8080
```
Frontend will be available at `http://localhost:3000`

## Configuration

### Frontend Options
- `-port` (default `:3000`): Port to serve frontend on
- `-backend` (default `http://localhost:8080`): Backend API URL

Example:
```bash
./cmd/frontend/frontend -port :3000 -backend http://localhost:8080
```

## Development

1. Start the backend in one terminal
2. Start the frontend in another terminal
3. Access the application at `http://localhost:3000`

## File Structure

```
cmd/
├── backend/
│   ├── main.go          # Backend API server
│   └── backend          # Compiled binary
├── frontend/
│   ├── main.go          # Frontend server with API proxy
│   ├── frontend         # Compiled binary
│   └── static/
│       ├── index.html   # Main page
│       ├── style.css    # Styling
│       └── script.js    # Client-side logic
└── qrcEmailGen/         # CLI tool (separate)
    ├── main.go
    └── env.json
internal/
└── qr/
    └── grCode.go        # QR code generation library
```
