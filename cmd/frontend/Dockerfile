FROM golang AS build

WORKDIR /go/src/app
COPY . .

ENV DEBIAN_FRONTEND=noninteractive


RUN go mod download
RUN cd ./cmd/frontend && go vet -v
RUN cd ./cmd/frontend && go test -v

RUN go build -o /go/bin/frontend ./cmd/frontend/frontend.go

FROM gcr.io/distroless/cc-debian13

LABEL org.opencontainers.image.source="https://github.com/ashcycling/qrc-gen-email"

COPY --from=build /go/bin/frontend /
CMD ["/frontend"]