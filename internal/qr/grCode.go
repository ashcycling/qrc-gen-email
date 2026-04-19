package qr

import (
	"log"
	"os"
	"reflect"

	qrcode "github.com/skip2/go-qrcode"
)

type QRCode struct {
	ServiceTag     string
	Version        string
	CharacterSet   string
	Identification string
	Bic            string
	Name           string
	IBAN           string
	Amount         string
}

// var qrdata QRCode

func qrCodeGenerateData(qrdata QRCode) string {

	var value string

	qrdata.ServiceTag = "BCD"
	qrdata.Version = "001"
	qrdata.CharacterSet = "1"
	qrdata.Identification = "SCT"
	// qrdata.Bic = "TUBDDEDDXXX"
	// qrdata.Name = "Fashion ID GmbH & Co.KG"
	// qrdata.IBAN = "DE15 3003 0880 0017 4520 02"
	// qrdata.amount = "EUR1"

	t := reflect.TypeOf(qrdata)
	data := reflect.ValueOf(qrdata)
	for i := 0; i < t.NumField(); i++ {
		value += data.Field(i).String() + "\n"
		// fmt.Print(value, "\n")

	}
	// fmt.Print("========================", "\n")
	log.Printf("QR Code Data as one string: %v", value)
	// fmt.Print("========================", "\n")
	return value
}

// QRCodeGenerate generates a QR code from the provided QRCode data and saves it to a temporary file.
// It returns the file path of the generated QR code image.
// If an error occurs during QR code generation, it logs the error and exits the program.
func QRCodeGenerate(qrdata QRCode) (string, string) {

	// png, err := qrcode.Encode(QRCodeGenerateData(), qrcode.Medium, 256)
	// tmpDir_path := "./data/out/"
	tmpDir_path := "/tmp/"
	tmpDir, _ := os.MkdirTemp(tmpDir_path, "QR")
	// Wrire error check
	qrCodeFilePath := tmpDir + "/qr.png"
	err := qrcode.WriteFile(qrCodeGenerateData(qrdata), qrcode.Medium, 256, qrCodeFilePath)
	if err != nil {
		// Rewrite error check
		log.Printf("Error generating QR code: %v", err)
	}
	log.Printf("QR Code saved to: %v", qrCodeFilePath)

	return qrCodeFilePath, tmpDir
}

func QRCodeGenerateEmail(qrdata string, qrCodeFilePath string, qrCodeSize int) {

	// png, err := qrcode.Encode(QRCodeGenerateData(), qrcode.Medium, 256)
	// tmpDir_path := "./data/out/"
	// tmpDir_path := "/tmp/"
	// tmpDir, _ := os.MkdirTemp(tmpDir_path, "QR")
	// Wrire error check
	// qrCodeFilePath := "./qrc-email.png"

	err := qrcode.WriteFile(qrdata, qrcode.Medium, qrCodeSize, qrCodeFilePath)
	if err != nil {
		// Rewrite error check
		log.Printf("Error generating QR code: %v", err)
	}
	log.Printf("QR Code saved to: %v", qrCodeFilePath)

	// return qrCodeFilePath, tmpDir
}

func QRCodeGenerateEmailInMemory(qrdata string, qrCodeSize int) ([]byte, error) {

	// png, err := qrcode.Encode(QRCodeGenerateData(), qrcode.Medium, 256)
	// tmpDir_path := "./data/out/"
	// tmpDir_path := "/tmp/"
	// tmpDir, _ := os.MkdirTemp(tmpDir_path, "QR")
	// Wrire error check
	// qrCodeFilePath := "./qrc-email.png"
	png, err := qrcode.Encode(qrdata, qrcode.Medium, qrCodeSize)
	// err := qrcode.WriteFile(qrdata, qrcode.Medium, qrCodeSize, qrCodeFilePath)
	if err != nil {
		// Rewrite error check
		log.Printf("Error generating QR code: %v", err)
	}
	log.Printf("QR Code generated in memory with size: %d bytes", len(png))

	return png, err
}
