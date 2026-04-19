package main

import (
	"fmt"
	"log"
	"net/url"
	"strings"

	"github.com/skip2/go-qrcode"
)

func main() {
	// Default values from env.json
	mailto := "example@example.com"
	subject := "Example Subject"

	// Build mailto URL (same as backend)
	qrDataString := fmt.Sprintf("mailto:%s", mailto)

	// URL encode the subject
	encodedSubject := url.QueryEscape(subject)
	encodedSubject = strings.ReplaceAll(encodedSubject, "+", "%20")
	qrDataString = fmt.Sprintf("mailto:%s?subject=%s", mailto, encodedSubject)

	log.Printf("Generating favicon for: %s", qrDataString)

	// Generate QR code as PNG with small size (32x32 for favicon)
	err := qrcode.WriteFile(qrDataString, qrcode.Medium, 32, "cmd/frontend/static/favicon.png")
	if err != nil {
		log.Fatalf("Error generating favicon: %v", err)
	}

	log.Println("Favicon generated successfully at cmd/frontend/static/favicon.png")
}
