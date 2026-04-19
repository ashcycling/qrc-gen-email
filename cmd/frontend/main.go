// package frontend
package main

import (
	"flag"
	"io"
	"log"
	"net/http"
	"path/filepath"
)

func main() {
	port := flag.String("port", ":3000", "Port to serve frontend on (e.g., :3000)")
	backendURL := flag.String("backend", "http://localhost:8080", "Backend API URL")
	flag.Parse()

	// Serve static files
	staticDir := filepath.Join(".", "cmd", "frontend", "static")
	fs := http.FileServer(http.Dir(staticDir))

	// Handle static files
	http.Handle("/static/", http.StripPrefix("/static/", fs))

	// Serve index.html for root path
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		http.ServeFile(w, r, filepath.Join(staticDir, "index.html"))
	})

	// Proxy API requests to backend
	http.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		proxyURL := *backendURL + r.URL.Path
		if r.URL.RawQuery != "" {
			proxyURL += "?" + r.URL.RawQuery
		}

		// Create a new request to the backend
		proxyReq, err := http.NewRequest(r.Method, proxyURL, r.Body)
		if err != nil {
			w.WriteHeader(http.StatusBadGateway)
			w.Write([]byte("Error creating proxy request"))
			log.Printf("Error creating proxy request: %v", err)
			return
		}

		// Copy headers (except Host)
		for key, values := range r.Header {
			if key != "Host" {
				for _, value := range values {
					proxyReq.Header.Add(key, value)
				}
			}
		}

		// Execute the proxy request
		client := &http.Client{}
		resp, err := client.Do(proxyReq)
		if err != nil {
			w.WriteHeader(http.StatusBadGateway)
			w.Write([]byte("Error connecting to backend"))
			log.Printf("Error connecting to backend: %v", err)
			return
		}
		defer resp.Body.Close()

		// Copy response status and headers
		for key, values := range resp.Header {
			for _, value := range values {
				w.Header().Add(key, value)
			}
		}
		w.WriteHeader(resp.StatusCode)

		// Copy response body
		_, err = io.Copy(w, resp.Body)
		if err != nil {
			log.Printf("Error writing response: %v", err)
		}
	})

	log.Printf("Frontend server starting on http://localhost%s", *port)
	log.Printf("Proxying API requests to %s", *backendURL)
	log.Fatal(http.ListenAndServe(*port, nil))
}
