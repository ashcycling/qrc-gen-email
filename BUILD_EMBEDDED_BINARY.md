# Building a Single Go Binary with Embedded Static Files

## What We Did

We refactored the frontend to use Go's `embed` package (Go 1.16+) to embed all static files directly into the binary.

## Key Changes

### 1. Frontend Code Update (`cmd/frontend/frontend.go`)

**Added:**
- `import "embed"` - Go's embed package
- `//go:embed static/*` - Directive to embed all static files
- `var staticFiles embed.FS` - Variable holding embedded files
- Updated file serving to use embedded files instead of disk I/O

**Benefits:**
- No need to distribute separate static files
- Binary is completely self-contained
- Faster file serving (no disk reads)
- Simpler Docker deployment

### 2. Dockerfile Optimization

**Changed from:**
```dockerfile
COPY --from=build /go/src/app/cmd/frontend/static ./cmd/frontend/static
```

**Changed to:**
```dockerfile
# Only copy the binary - static files are embedded
COPY --from=build /go/bin/frontend /
```

This removes the need to copy static files since they're embedded in the binary.

## Building

### Simple Build

```bash
# Build frontend with embedded static files
go build -o frontend ./cmd/frontend

# Build backend (standalone)
go build -o backend ./cmd/backend

# Or build both
go build -o backend ./cmd/backend && go build -o frontend ./cmd/frontend
```

### Optimized Build (Smaller Binary)

```bash
# Strip debug symbols and dwarf info (-s -w flags)
go build -ldflags="-s -w" -o frontend ./cmd/frontend
go build -ldflags="-s -w" -o backend ./cmd/backend
```

**Size Comparison:**
- Standard build: ~7.7 MB (includes debug info)
- Optimized build: ~5-6 MB (smaller but still functional)

## Running

The binary is now completely self-contained:

```bash
# Terminal 1 - Backend
./backend

# Terminal 2 - Frontend (no static files needed!)
./frontend -port :3000 -backend http://localhost:8080

# Or with environment variables
BACKEND_HOST=localhost BACKEND_PORT=8080 ./frontend
```

## Docker

The Docker image is now simpler and smaller:

```dockerfile
FROM golang:1.23 AS builder
WORKDIR /app
COPY . .
RUN go build -ldflags="-s -w" -o frontend ./cmd/frontend

FROM gcr.io/distroless/cc-debian13
COPY --from=build /app/frontend /
EXPOSE 3000
ENV BACKEND_HOST=backend-service
ENV BACKEND_PORT=8080
CMD ["/frontend"]
```

## Kubernetes Deployment

No changes needed! The deployment still works the same way:

```yaml
- image: ghcr.io/ashcycling/frontend:latest
  env:
  - name: BACKEND_HOST
    value: "qrc-gen-back-service.qrc-gen.svc.cluster.local"
  - name: BACKEND_PORT
    value: "8080"
```

## Verification

Check that files are embedded:

```bash
# Verify HTML is in the binary
strings ./frontend | grep "QR Code Email Generator"

# Check CSS is embedded
strings ./frontend | grep "font-family"

# Verify favicon PNG is there
strings ./frontend | grep "favicon"
```

## Advantages

✅ **Single Binary** - No need to manage separate static files
✅ **Immutable** - Static files can't be accidentally modified or deleted
✅ **Portable** - Copy one file, deploy everywhere
✅ **Secure** - No exposed static files on the filesystem
✅ **Faster** - No disk I/O for static content (though cached)
✅ **Docker-Friendly** - Smaller final container image
✅ **Development-Ready** - Still can modify files in development, recompile for production

## Limitations

- File updates require recompilation
- Binary size increases slightly (acceptable trade-off)
- Maximum embed size depends on Go version (usually 2GB+)

## Go Version

Requires Go 1.16 or later. Check your version:

```bash
go version
```

## Reference

- [Go embed package documentation](https://golang.org/pkg/embed/)
- [Embedding Files in Go](https://golang.org/doc/embed)
