FROM golang AS build

WORKDIR /go/src/app
COPY . .

ENV DEBIAN_FRONTEND=noninteractive

RUN go mod download
RUN cd ./cmd/frontend && go vet -v
RUN cd ./cmd/frontend && go test -v

# Build with embedded static files - no external files needed
RUN go build -ldflags="-s -w" -o /go/bin/frontend ./cmd/frontend

FROM gcr.io/distroless/cc-debian13

LABEL org.opencontainers.image.source="https://github.com/ashcycling/qrc-gen-email"

# Only copy the binary - static files are embedded
COPY --from=build /go/bin/frontend /

# EXPOSE 3000

# ENV BACKEND_HOST=qrc-gen-back-service.qrc-gen.svc.cluster.local
# ENV BACKEND_PORT=8080

# CMD ["/frontend", "-port", ":3000"]
CMD ["/frontend"]