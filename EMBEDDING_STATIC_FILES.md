# Embedding Static Files in Go Binary

The frontend is now configured to embed all static files (HTML, CSS, JS, PNG) into a single binary using Go's `embed` package.

## How It Works

The `//go:embed static/*` directive tells the Go compiler to include all files in the `static/` directory in the compiled binary. The embedded files are stored in the `staticFiles` variable of type `embed.FS`.

### Benefits:
- ✅ Single binary file - no need to distribute separate static files
- ✅ Faster deployment - no file I/O for static files
- ✅ Immutable static files - included at compile time
- ✅ Easier Docker containerization

## Building

### Build Frontend with Embedded Static Files

```bash
# From project root
go build -o frontend ./cmd/frontend

# Or with version info
go build -ldflags="-s -w" -o frontend ./cmd/frontend
```

### Build Backend (already standalone)

```bash
go build -o backend ./cmd/backend
```

### Build Both

```bash
# Build both binaries
go build -o backend ./cmd/backend && go build -o frontend ./cmd/frontend

# Or with optimized flags (smaller binary)
go build -ldflags="-s -w" -o backend ./cmd/backend && \
go build -ldflags="-s -w" -o frontend ./cmd/frontend
```

## Running the Single Binary

The binary now includes all static files, so you only need the binary file:

```bash
# Terminal 1 - Backend
./backend

# Terminal 2 - Frontend (with environment variables)
BACKEND_HOST=localhost BACKEND_PORT=8080 ./frontend -port :3000

# Or use flag override
./frontend -port :3000 -backend http://localhost:8080
```

## Docker Deployment

Since static files are embedded, the Dockerfile can be simplified:

```dockerfile
# Build stage
FROM golang:1.23 AS builder
WORKDIR /app
COPY . .
RUN go build -ldflags="-s -w" -o frontend ./cmd/frontend

# Runtime stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/frontend .
EXPOSE 3000

ENV BACKEND_HOST=qrc-gen-back-service.qrc-gen.svc.cluster.local
ENV BACKEND_PORT=8080

CMD ["./frontend", "-port", ":3000"]
```

## Key Points

1. **Embed Directive**: `//go:embed static/*` must be in a package-level variable declaration
2. **File Paths**: Use forward slashes in embed paths (works cross-platform)
3. **Binary Size**: Embedded files increase binary size slightly (use `-ldflags="-s -w"` to optimize)
4. **No External Files Needed**: The binary is completely self-contained
5. **Development vs Production**: For development, you can still modify files; for production, recompile to update

## Verifying Embedding

To verify static files are embedded in the binary:

```bash
# Check binary size (should be reasonable for embedded files)
ls -lh frontend

# File should contain the HTML content
strings frontend | grep "QR Code Email Generator"
```

## Migration Notes

No code changes needed for existing deployments:
- Environment variables still work: `BACKEND_HOST`, `BACKEND_PORT`
- Command-line flags still work: `-port`, `-backend`
- API proxying works the same way
- All functionality is identical
