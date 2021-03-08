package services

import (
	"encoding/json"
	"eth2-exporter/utils"
	"fmt"
	"net/http"
	"time"

	"sync"
)

type gitcoinfeed struct {
	Meta      interface{} `json:"meta"`
	Addresses [][4]string `json:"addresses"`
}

var feed *gitcoinfeed
var feedMux = &sync.RWMutex{}
var feedOn = false
var feedOnMux = &sync.RWMutex{}

func fetchFeedData() *gitcoinfeed {
	var api gitcoinfeed
	resp, err := http.Get(fmt.Sprintf("https://gitcoin.co/grants/v1/api/export_info/grant258_round9.json?_key=%s&_secret=%s", utils.Config.ShowDonors.Key, utils.Config.ShowDonors.Secret))
	// resp, err := http.Get("http://localhost:5000/addrs") // use this for mock script
	// logger.Errorln(resp)

	if err != nil {
		logger.Errorf("error retrieving gitcoin feed Data: %v", err)
		return nil
	}

	defer resp.Body.Close()

	err = json.NewDecoder(resp.Body).Decode(&api)

	if err != nil {
		logger.Errorf("error decoding gitcoin feed json response to struct: %v", err)
		return nil
	}

	return &api
}

func updateFeed() {
	feedMux.Lock()
	defer feedMux.Unlock()
	tempFeed := fetchFeedData()
	if tempFeed == nil { // don't delete the existing users
		logger.Infoln("Gitcoin feed: empty respons")
		return
	}
	feed = tempFeed
}

func InitGitCoinFeed() {
	feedOnMux.Lock()
	defer feedOnMux.Unlock()
	feedOn = true
	go func() {
		logger.Infoln("Started GitcoinFeed service")
		for true {
			updateFeed()
			time.Sleep(time.Second * 5)
		}
	}()
}

func GetFeed() [][4]string {
	feedMux.Lock()
	defer feedMux.Unlock()

	if feed == nil {
		return [][4]string{}
	}

	return feed.Addresses
}

func IsFeedOn() bool {
	feedOnMux.Lock()
	defer feedOnMux.Unlock()
	return feedOn
}
