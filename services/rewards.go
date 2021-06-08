package services

import (
	"bytes"
	"eth2-exporter/db"
	"eth2-exporter/types"
	"eth2-exporter/utils"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/jung-kurt/gofpdf"
	"github.com/lib/pq"
	"golang.org/x/text/language"
	"golang.org/x/text/message"
)

type rewardHistory struct {
	History       [][]string `json:"history"`
	TotalETH      string     `json:"total_eth"`
	TotalCurrency string     `json:"total_currency"`
}

func GetValidatorHist(validatorArr []uint64, currency string, start uint64, end uint64) rewardHistory {
	var err error
	validatorFilter := pq.Array(validatorArr)

	var pricesDb []types.Price
	err = db.DB.Select(&pricesDb,
		`select * from price where ts >= TO_TIMESTAMP($1) and ts <= TO_TIMESTAMP($2) order by ts desc`, start, end)
	if err != nil {
		logger.Errorf("error getting prices: %w", err)
	}

	var maxDay uint64
	err = db.DB.Get(&maxDay,
		`select MAX(day) from validator_stats`)
	if err != nil {
		logger.Errorf("error getting max day: %w", err)
	}

	lowerBound := utils.TimeToDay(start)
	upperBound := utils.TimeToDay(end)

	var income []types.ValidatorStatsTableRow
	err = db.DB.Select(&income,
		`select day, start_balance, end_balance
		 from validator_stats 
		 where validatorindex=ANY($1) AND day > $2 AND day < $3
		 order by day desc`, validatorFilter, lowerBound, upperBound)
	if err != nil {
		logger.Errorf("error getting incomes: %w", err)
	}

	prices := map[string]float64{}
	for _, item := range pricesDb {
		date := fmt.Sprintf("%v", item.TS)
		date = strings.Split(date, " ")[0]
		switch currency {
		case "eur":
			prices[date] = item.EUR
		case "usd":
			prices[date] = item.USD
		case "gbp":
			prices[date] = item.GBP
		case "cad":
			prices[date] = item.CAD
		case "cny":
			prices[date] = item.CNY
		case "jpy":
			prices[date] = item.JPY
		case "rub":
			prices[date] = item.RUB
		default:
			prices[date] = item.USD
			currency = "usd"
		}
	}

	totalIncomePerDay := map[string][2]int64{}
	for _, item := range income {
		date := fmt.Sprintf("%v", utils.DayToTime(item.Day))
		date = strings.Split(date, " ")[0]
		if _, exist := totalIncomePerDay[date]; !exist {
			totalIncomePerDay[date] = [2]int64{item.StartBalance.Int64, item.EndBalance.Int64}
			continue
		}
		state := totalIncomePerDay[date]
		state[0] += item.StartBalance.Int64
		state[1] += item.EndBalance.Int64
		totalIncomePerDay[date] = state
	}

	data := make([][]string, len(totalIncomePerDay))
	i := 0
	tETH := 0.0
	tCur := 0.0
	for key, item := range totalIncomePerDay {
		if len(item) < 2 {
			continue
		}
		iETH := (float64(item[1]) / 1e9) - (float64(item[0]) / 1e9)
		tETH += iETH
		iCur := ((float64(item[1]) / 1e9) - (float64(item[0]) / 1e9)) * prices[key]
		tCur += iCur
		data[i] = []string{
			key,
			addCommas(float64(item[1])/1e9, "%.5f"), // end of day balance
			addCommas(iETH, "%.5f"),                 // income of day ETH
			fmt.Sprintf("%s %s", strings.ToUpper(currency), addCommas(prices[key], "%.2f")), //price will default to 0 if key does not exist
			fmt.Sprintf("%s %s", strings.ToUpper(currency), addCommas(iCur, "%.2f")),        // income of day Currency
		}
		i++
	}

	return rewardHistory{
		History:       data,
		TotalETH:      addCommas(tETH, "%.5f"),
		TotalCurrency: fmt.Sprintf("%s %s", strings.ToUpper(currency), addCommas(tCur, "%.2f")),
	}
}

func addCommas(balance float64, decimals string) string {
	p := message.NewPrinter(language.English)
	rb := []rune(p.Sprintf(decimals, balance))
	// remove trailing zeros
	if rb[len(rb)-2] == '.' || rb[len(rb)-3] == '.' {
		for rb[len(rb)-1] == '0' {
			rb = rb[:len(rb)-1]
		}
		if rb[len(rb)-1] == '.' {
			rb = rb[:len(rb)-1]
		}
	}

	return string(rb)
}

func GeneratePdfReport(hist rewardHistory) []byte {

	data := hist.History

	sort.Slice(data, func(p, q int) bool {
		i, err := time.Parse("2006-01-02", data[p][0])
		i2, err := time.Parse("2006-01-02", data[q][0])
		if err != nil {
			return false
		}
		return i2.Before(i)
	})

	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetTopMargin(15)
	pdf.SetHeaderFuncMode(func() {
		pdf.SetY(5)
		pdf.SetFont("Arial", "B", 15)
		pdf.Cell(80, 0, "")
		pdf.CellFormat(30, 10, "Beaconcha.in Monthly Reward History", "", 0, "C", false, 0, "")
		// pdf.Ln(-1)
	}, true)

	pdf.AddPage()
	pdf.SetFont("Times", "", 9)

	// generating the table
	const (
		colCount = 5
		colWd    = 40.0
		marginH  = 5.0
		lineHt   = 5.5
		maxHt    = 5
	)

	header := [colCount]string{"Date", "End-of-date balance ETH", "Income for date ETH", "Price of ETH for date", "Income for date"}

	// pdf.SetMargins(marginH, marginH, marginH)

	pdf.SetTextColor(224, 224, 224)
	pdf.SetFillColor(64, 64, 64)
	pdf.Cell(-5, 0, "")
	for col := 0; col < colCount; col++ {
		pdf.CellFormat(colWd, maxHt, header[col], "1", 0, "CM", true, 0, "")
	}
	pdf.Ln(-1)
	pdf.SetTextColor(24, 24, 24)
	pdf.SetFillColor(255, 255, 255)

	// Rows
	y := pdf.GetY()

	for _, row := range data {
		x := marginH
		for col := 0; col < colCount; col++ {
			pdf.Rect(x, y, colWd, maxHt, "D")
			cellY := y
			pdf.SetXY(x, cellY)
			pdf.CellFormat(colWd, maxHt, row[col], "", 0,
				"LM", false, 0, "")
			cellY += lineHt
			x += colWd
		}
		y += maxHt
	}

	pdf.Ln(10)
	pdf.CellFormat(0, maxHt, fmt.Sprintf("Total ETH %s | Total %s", hist.TotalETH, hist.TotalCurrency), "1", 0, "CM", true, 0, "")

	// adding a footer
	pdf.AliasNbPages("")
	pdf.SetFooterFunc(func() {
		pdf.SetY(-15)
		pdf.SetFont("Arial", "I", 8)
		pdf.CellFormat(0, 10, fmt.Sprintf("Page %d/{nb}", pdf.PageNo()),
			"", 0, "C", false, 0, "")
	})

	buf := new(bytes.Buffer)
	pdf.Output(buf)

	return buf.Bytes()

}

func GetMonthlyPdf(validatorArr []uint64, currency string, start uint64, end uint64) []byte {
	hist := GetValidatorHist(validatorArr, currency, start, end)
	return GeneratePdfReport(hist)
}