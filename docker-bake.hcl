group "default" {
  targets = ["backend", "frontend"]
}

group "backend" {
  targets = ["backend"]
}
group "frontend" {
  targets = ["frontend"]
}

target "backend" {
  dockerfile = "cmd/backend/Dockerfile"
  tags = ["ghcr.io/ashcycling/backend:v0.0.1"]
}

target "frontend" {
  dockerfile = "cmd/frontend/Dockerfile"
  tags = ["ghcr.io/ashcycling/frontend:v0.0.1"]
}