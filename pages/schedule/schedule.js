const app = getApp();
const dataSync = require("../../utils/dataSync");
const matchStatus = require("../../utils/matchStatus");
const timezone = require("../../utils/timezone");

Page({
  data: {
    navHeight: 0,
    dateList: [],
    selectedDate: "",
    filteredMatches: [],
    adVisible: true
  },

  onLoad() {
    this.setData({ navHeight: app.globalData.navBarHeight });
    this.initDateList();
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this.loadMatches();
  },

  onPullDownRefresh() {
    dataSync.checkUpdate(true).then((updated) => {
      if (updated) {
        this.loadMatches();
      }
      wx.stopPullDownRefresh();
    }).catch(() => {
      wx.stopPullDownRefresh();
    });
  },

  initDateList() {
    const today = dataSync.todayBeijing();
    const dateList = [];
    
    // Generate dates from June 11 to July 19, 2026
    const startDate = new Date("2026-06-11");
    const endDate = new Date("2026-07-19");
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = this.formatDate(d);
      const isToday = dateStr === today;
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      
      dateList.push({
        date: dateStr,
        day: d.getDate(),
        week: this.getWeekday(d.getDay()),
        isToday,
        isWeekend
      });
    }
    
    this.setData({
      dateList,
      selectedDate: today || dateList[0]?.date
    });
  },

  formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  },

  getWeekday(day) {
    const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
    return weekdays[day];
  },

  loadMatches() {
    const tournamentData = app.getTournamentData();
    if (!tournamentData) return;

    const { matches } = tournamentData;
    const selectedDate = this.data.selectedDate;
    
    const filteredMatches = matches.filter(m => {
      const matchDate = this.getMatchBeijingDate(m);
      return matchDate === selectedDate;
    });

    this.setData({ filteredMatches });
  },

  getMatchBeijingDate(match) {
    if (!match || !match.date || !match.time) return "";
    const result = timezone.convertByVenue(match.time, match.date, match.venue);
    return result ? result.date : match.date;
  },

  onDateSelect(e) {
    const date = e.currentTarget.dataset.date;
    this.setData({ selectedDate: date });
    this.loadMatches();
  },

  onAdLoad() {
    this.setData({ adVisible: true });
  },

  onAdError(e) {
    console.warn("Ad error:", e.detail);
    this.setData({ adVisible: false });
  },

  onAdClose() {
    this.setData({ adVisible: false });
  }
});