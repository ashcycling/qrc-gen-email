package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"

	"github.com/ashcycling/qrc-gen-email/internal/qr"
)

// Request represents the JSON request from the frontend
type Request struct {
	QRCSize int    `json:"qrcSize"`
	MailTo  string `json:"mailto"`
	Subject string `json:"subject"`
}

// Response represents the JSON response to the frontend
type Response struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// handlePostData handles POST requests from the frontend
func handlePostData(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	// Read the request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(Response{
			Success: false,
			Message: "Error reading request body",
		})
		return
	}
	defer r.Body.Close()

	// Parse the request
	var req Request
	err = json.Unmarshal(body, &req)
	if err != nil {
		log.Printf("Error parsing JSON: %v. Received body: %s", err, string(body))
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(Response{
			Success: false,
			Message: fmt.Sprintf("Error parsing JSON: %v", err),
		})
		return
	}

	// Log the received data
	log.Printf("Received data: %+v", req)

	// Build mailto URL for QR code encoding
	qrDataString := fmt.Sprintf("mailto:%s", req.MailTo)
	if req.Subject != "" {
		// URL encode the subject - ensure spaces are %20, not +
		encodedSubject := url.QueryEscape(req.Subject)
		// RFC 3986 specifies spaces as %20, not +
		encodedSubject = strings.ReplaceAll(encodedSubject, "+", "%20")
		qrDataString = fmt.Sprintf("mailto:%s?subject=%s", req.MailTo, encodedSubject)
	}
	log.Printf("QR Code data: %s", qrDataString)

	// Generate QR code in memory
	pngData, err := qr.QRCodeGenerateEmailInMemory(qrDataString, req.QRCSize)
	if err != nil {
		log.Printf("Error generating QR code: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(Response{
			Success: false,
			Message: "Error generating QR code",
		})
		return
	}

	// Encode PNG data as base64 for JSON response
	base64QR := base64.StdEncoding.EncodeToString(pngData)

	// Return success response with base64-encoded QR code
	response := Response{
		Success: true,
		Message: "QR code generated successfully",
		Data: map[string]interface{}{
			"qrCodeBase64": base64QR,
			"qrDataString": qrDataString,
			"received":     req,
		},
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// handleQRCode generates and serves QR code as PNG
func handleQRCode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract QR data from query parameter
	qrData := r.URL.Query().Get("data")
	if qrData == "" {
		http.Error(w, "Missing data parameter", http.StatusBadRequest)
		return
	}

	// Extract size from query parameter (optional, default 256)
	qrSize := 256
	if sizeStr := r.URL.Query().Get("size"); sizeStr != "" {
		_, err := fmt.Sscanf(sizeStr, "%d", &qrSize)
		if err != nil {
			qrSize = 256
		}
	}

	// Generate QR code in memory
	pngData, err := qr.QRCodeGenerateEmailInMemory(qrData, qrSize)
	if err != nil {
		log.Printf("Error generating QR code: %v", err)
		http.Error(w, "Error generating QR code", http.StatusInternalServerError)
		return
	}

	// Serve as PNG with download attachment
	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Content-Disposition", "attachment; filename=qr-code.png")
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(pngData)))

	_, err = w.Write(pngData)
	if err != nil {
		log.Printf("Error writing response: %v", err)
	}
}

func main() {
	// Setup API routes only
	http.HandleFunc("/api/process", handlePostData)
	http.HandleFunc("/api/qrcode", handleQRCode)

	// Start server
	port := ":8080"
	log.Printf("Backend API server starting on http://localhost%s", port)
	log.Fatal(http.ListenAndServe(port, nil))
}
