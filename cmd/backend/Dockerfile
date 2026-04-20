FROM golang AS build

WORKDIR /go/src/app
COPY . .

ENV DEBIAN_FRONTEND=noninteractive


RUN go mod download
RUN cd ./cmd/backend && go vet -v
RUN cd ./cmd/backend && go test -v

RUN go build -o /go/bin/backend ./cmd/backend/backend.go

FROM gcr.io/distroless/cc-debian13

LABEL org.opencontainers.image.source="https://github.com/ashcycling/qrc-gen-email"

COPY --from=build /go/bin/backend /
CMD ["/backend"]