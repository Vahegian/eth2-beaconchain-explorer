package handlers

import (
	"bytes"
	"encoding/json"
	"eth2-exporter/db"
	"eth2-exporter/types"
	"eth2-exporter/utils"
	"fmt"
	"html/template"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/csrf"
	"github.com/jung-kurt/gofpdf"
	"github.com/lib/pq"
	"golang.org/x/text/language"
	"golang.org/x/text/message"
)

var validatorRewardsServicesTemplate = template.Must(template.New("validatorRewards").Funcs(utils.GetTemplateFuncs()).ParseFiles("templates/layout.html", "templates/validatorRewards.html"))

// var supportedCurrencies = []string{"eur", "usd", "gbp", "cny", "cad", "jpy", "rub"}

type rewardsResp struct {
	Currencies       []string
	CsrfField        template.HTML
	Subscriptions    [][]string
	MinDateTimestamp uint64
}

type rewardHistory struct {
	History       [][]string `json:"history"`
	TotalETH      string     `json:"total_eth"`
	TotalCurrency string     `json:"total_currency"`
}

func ValidatorRewards(w http.ResponseWriter, r *http.Request) {
	var err error

	w.Header().Set("Content-Type", "text/html")

	data := InitPageData(w, r, "services", "/rewards", "Ethereum Validator Rewards")

	var supportedCurrencies []string
	err = db.DB.Select(&supportedCurrencies,
		`select column_name 
			from information_schema.columns 
			where table_name = 'price'`)
	if err != nil {
		logger.Errorf("error getting eth1-deposits-distribution for stake pools: %w", err)
	}

	var minTime time.Time
	err = db.DB.Get(&minTime,
		`select ts from price order by ts asc limit 1`)
	if err != nil {
		logger.Errorf("error getting min ts: %w", err)
	}

	var subs = [][]string{}

	if data.User.Authenticated {
		subs = getUserRewardSubscriptions(data.User.UserID)
	}

	data.Data = rewardsResp{Currencies: supportedCurrencies, CsrfField: csrf.TemplateField(r), Subscriptions: subs, MinDateTimestamp: uint64(minTime.Unix())}

	err = validatorRewardsServicesTemplate.ExecuteTemplate(w, "layout", data)
	if err != nil {
		logger.Errorf("error executing template for %v route: %v", r.URL.String(), err)
		http.Error(w, "Internal server error", 503)
		return
	}
}

func getUserRewardSubscriptions(uid uint64) [][]string {
	var dbResp []types.Subscription
	err := db.DB.Select(&dbResp,
		`select * from users_subscriptions where event_name=$1 AND user_id=$2`, types.TaxReportEventName, uid)
	if err != nil {
		logger.Errorf("error getting prices: %w", err)
	}

	res := make([][]string, len(dbResp))
	for i, item := range dbResp {
		q, err := url.ParseQuery(item.EventFilter)
		if err != nil {
			continue
		}
		res[i] = []string{
			fmt.Sprintf("%v", item.CreatedTime),
			q.Get("currency"),
			q.Get("validators"),
			item.EventFilter,
		}
	}

	return res
}

func getValidatorHist(validatorArr []uint64, currency string, start uint64, end uint64) rewardHistory {
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

func isValidCurrency(currency string) bool {
	var count uint64
	err := db.DB.Get(&count,
		`select count(column_name) 
		from information_schema.columns 
		where table_name = 'price' AND column_name=$1;`, currency)
	if err != nil {
		logger.Errorf("error checking currency: %w", err)
		return false
	}

	if count > 0 {
		return true
	}

	return false
}

func RewardsHistoricalData(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	q := r.URL.Query()

	validatorArr, err := parseValidatorsFromQueryString(q.Get("validators"))
	if err != nil {
		logger.Errorf("error retrieving active validators %v", err)
		http.Error(w, "Invalid query", 400)
		return
	}

	currency := q.Get("currency")

	var start uint64 = 0
	var end uint64 = 0
	dateRange := strings.Split(q.Get("days"), "-")
	if len(dateRange) == 2 {
		start, err = strconv.ParseUint(dateRange[0], 10, 64)
		end, err = strconv.ParseUint(dateRange[1], 10, 64)
		if err != nil {
			logger.Errorf("error retrieving days range %v", err)
			http.Error(w, "Invalid query", 400)
			return
		}
	}

	// days, err := strconv.ParseUint(q.Get("days"), 10, 64)

	data := getValidatorHist(validatorArr, currency, start, end)

	err = json.NewEncoder(w).Encode(data)
	if err != nil {
		logger.WithError(err).WithField("route", r.URL.String()).Error("error encoding json response")
		http.Error(w, "Internal server error", 503)
		return
	}

}

func DownloadRewardsHistoricalData(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Disposition", "attachment; filename=beaconcha_in-rewards-history.pdf")
	w.Header().Set("Content-Type", "text/csv")

	q := r.URL.Query()

	validatorArr, err := parseValidatorsFromQueryString(q.Get("validators"))
	if err != nil {
		logger.Errorf("error retrieving active validators %v", err)
		http.Error(w, "Invalid query", 400)
		return
	}

	currency := q.Get("currency")

	var start uint64 = 0
	var end uint64 = 0
	dateRange := strings.Split(q.Get("days"), "-")
	if len(dateRange) == 2 {
		start, err = strconv.ParseUint(dateRange[0], 10, 64)
		end, err = strconv.ParseUint(dateRange[1], 10, 64)
		if err != nil {
			logger.Errorf("error retrieving days range %v", err)
			http.Error(w, "Invalid query", 400)
			return
		}
	}

	hist := getValidatorHist(validatorArr, currency, start, end)
	// data := hist.History

	if len(hist.History) == 0 {
		w.Write([]byte("No data available"))
		return
	}

	// cur := data[0][len(data[0])-1]
	// cur = strings.ToUpper(cur)
	// csv := fmt.Sprintf("Date,End-of-date balance ETH,Income for date ETH,Price of ETH for date %s, Income for date %s", cur, cur)

	// totalIncomeEth := 0.0
	// totalIncomeCur := 0.0

	// for _, item := range data {
	// 	if len(item) < 5 {
	// 		csv += "\n0,0,0,0,0"
	// 		continue
	// 	}
	// 	csv += fmt.Sprintf("\n%s,%s,%s,%s,%s", item[0], item[1], item[2], item[3], item[4])
	// 	tEth, err := strconv.ParseFloat(item[2], 64)
	// 	tCur, err := strconv.ParseFloat(item[4], 64)

	// 	if err != nil {
	// 		continue
	// 	}

	// 	totalIncomeEth += tEth
	// 	totalIncomeCur += tCur
	// }

	// csv += fmt.Sprintf("\nTotal, ,%f, ,%f", totalIncomeEth, totalIncomeCur)

	_, err = w.Write(generatePdfReport(hist))
	if err != nil {
		logger.WithError(err).WithField("route", r.URL.String()).Error("error writing response")
		http.Error(w, "Internal server error", 503)
		return
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

func generatePdfReport(hist rewardHistory) []byte {

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

func RewardNotificationSubscribe(w http.ResponseWriter, r *http.Request) {
	SetAutoContentType(w, r)
	user := getUser(w, r)
	if !user.Authenticated {
		logger.WithField("route", r.URL.String()).Error("User not Authenticated")
		http.Error(w, "Internal server error, User Not Authenticated", http.StatusInternalServerError)
		return
	}

	q := r.URL.Query()

	validatorArr := q.Get("validators")
	_, err := parseValidatorsFromQueryString(validatorArr)
	if err != nil {
		http.Error(w, "Invalid query, Invalid Validators", 400)
		return
	}

	currency := q.Get("currency")

	if validatorArr == "" || !isValidCurrency(currency) {
		logger.WithField("route", r.URL.String()).Error("Bad Query")
		http.Error(w, "Internal server error, Bad Query", http.StatusInternalServerError)
		return
	}

	err = db.AddSubscription(user.UserID,
		types.TaxReportEventName,
		fmt.Sprintf("validators=%s&days=30&currency=%s", validatorArr, currency))

	if err != nil {
		logger.Errorf("error updating user subscriptions: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	err = json.NewEncoder(w).Encode(struct {
		Msg string `json:"msg"`
	}{Msg: "Subscription Updated"})

	if err != nil {
		logger.WithError(err).WithField("route", r.URL.String()).Error("error encoding json response")
		http.Error(w, "Internal server error", 503)
		return
	}

}

func RewardNotificationUnsubscribe(w http.ResponseWriter, r *http.Request) {
	SetAutoContentType(w, r)
	user := getUser(w, r)
	if !user.Authenticated {
		logger.WithField("route", r.URL.String()).Error("User not Authenticated")
		http.Error(w, "Internal server error, User Not Authenticated", http.StatusInternalServerError)
		return
	}

	q := r.URL.Query()

	validatorArr := q.Get("validators")

	currency := q.Get("currency")

	if validatorArr == "" || !isValidCurrency(currency) {
		logger.WithField("route", r.URL.String()).Error("Bad Query")
		http.Error(w, "Internal server error, Bad Query", http.StatusInternalServerError)
		return
	}

	err := db.DeleteSubscription(user.UserID,
		types.TaxReportEventName,
		fmt.Sprintf("validators=%s&days=30&currency=%s", validatorArr, currency))

	if err != nil {
		logger.Errorf("error deleting entry from user subscriptions: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	err = json.NewEncoder(w).Encode(struct {
		Msg string `json:"msg"`
	}{Msg: "Subscription Deleted"})

	if err != nil {
		logger.WithError(err).WithField("route", r.URL.String()).Error("error encoding json response")
		http.Error(w, "Internal server error", 503)
		return
	}
}
