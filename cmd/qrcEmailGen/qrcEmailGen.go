package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/ashcycling/qrc-gen-email/internal/qr"
)

// Описываем структуру JSON.
// Теги `json:"..."` связывают поля файла с полями структуры.
type Config struct {
	QRCSize int    `json:"qrcSize"`
	Mailto  string `json:"mailto"`
	Subject string `json:"subject"`
}

func main() {
	// 1. Получаем путь к папке, где лежит исполняемый файл
	exePath, err := os.Executable()
	if err != nil {
		fmt.Println("Error getting file path:", err)
		return
	}
	exeDir := filepath.Dir(exePath)

	// 2. Формируем путь к env.json (универсально для Win/Linux)
	configPath := filepath.Join(exeDir, "env.json")

	// 3. Формируем путь к qrc-email.png (универсально для Win/Linux)
	qrCodeFilePath := filepath.Join(exeDir, "qrc-email.png")

	// 4. Читаем файл целиком
	data, err := os.ReadFile(configPath)
	if err != nil {
		fmt.Printf("Не удалось прочитать файл %s: %v\n", configPath, err)
		fmt.Printf("Создаем стандартный файл, который необходимо отредактировать\n")
		// Необходимо написать логику создания стандартного файла env.json, который необходимо отредактировать
		createEnvFile(filepath.Join(exeDir, "env.json"))
		return
	}

	// 4. Декодируем JSON в структуру
	var config Config
	err = json.Unmarshal(data, &config)
	if err != nil {
		fmt.Println("Ошибка парсинга JSON:", err)
		return
	}

	var qrcData string
	// 5. Формируем строку для QR кода
	if strings.TrimSpace(config.Subject) != "" {
		qrcData = fmt.Sprintf("mailto:%s?subject=%s", config.Mailto, config.Subject)
	} else {
		qrcData = fmt.Sprintf("mailto:%s", config.Mailto)
	}

	// 6. Генерируем QR код

	qr.QRCodeGenerateEmail(qrcData, qrCodeFilePath, config.QRCSize)

}

// func main() {

// 	qr.QRCodeGenerateEmail()

// }

func createEnvFile(path string) {
	// Создаем стандартный файл env.json, который необходимо отредактировать
	defaultConfig := Config{
		QRCSize: 256,
		Mailto:  "example@example.com",
		Subject: "Example Subject",
	}

	data, err := json.MarshalIndent(defaultConfig, "", "  ")
	if err != nil {
		fmt.Println("Error creating default env.json:", err)
		return
	}

	err = os.WriteFile(path, data, 0644)
	if err != nil {
		fmt.Println("Error writing default env.json:", err)
		return
	}

	fmt.Printf("Default env.json created at: %s\n", path)
}
