const app = getApp();
const dataSync = require("../../utils/dataSync");
const matchStatus = require("../../utils/matchStatus");
const timezone = require("../../utils/timezone");

Page({
  data: {
    navHeight: 0,
    matchGroups: [],
    loading: true
  },

  onLoad() {
    this.setData({ navHeight: app.globalData.navBarHeight });
    this.loadRecentMatches();
  },

  onPullDownRefresh() {
    dataSync.checkUpdate(true).then((updated) => {
      if (updated) {
        this.loadRecentMatches();
      }
      wx.stopPullDownRefresh();
    }).catch(() => {
      wx.stopPullDownRefresh();
    });
  },

  loadRecentMatches() {
    const tournamentData = app.getTournamentData();
    if (!tournamentData) return;

    const { matches } = tournamentData;
    const today = dataSync.todayBeijing();
    
    // Get matches for the next 7 days
    const recentMatches = [];
    const startDate = new Date(today);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = this.formatDate(date);
      
      const dayMatches = matches.filter(m => {
        const matchDate = this.getMatchBeijingDate(m);
        return matchDate === dateStr;
      }).map(m => {
        const status = matchStatus.normalizeStatus(m.status);
        const MATCH_STATUS = matchStatus.MATCH_STATUS;
        const isLive = status === MATCH_STATUS.LIVE;
        const isFinished = status === MATCH_STATUS.FINISHED;
        
        let scoreText = "VS";
        if (m.score && m.score.ft) {
          scoreText = `${m.score.ft[0]} - ${m.score.ft[1]}`;
        }
        
        let statusText = "";
        let statusClass = "";
        if (isLive) {
          statusText = "进行中";
          statusClass = "live";
        } else if (isFinished) {
          statusText = "已结束";
          statusClass = "finished";
        } else {
          statusText = "未开始";
        }
        
        return {
          ...m,
          scoreText,
          statusText,
          statusClass,
          isLive,
          isFinished
        };
      });
      
      if (dayMatches.length > 0) {
        recentMatches.push({
          date: dateStr,
          dateDisplay: this.formatDateDisplay(date),
          weekday: this.getWeekday(date),
          matches: dayMatches
        });
      }
    }

    this.setData({
      matchGroups: recentMatches,
      loading: false
    });
  },

  getMatchBeijingDate(match) {
    if (!match || !match.date || !match.time) return "";
    const result = timezone.convertByVenue(match.time, match.date, match.venue);
    return result ? result.date : match.date;
  },

  formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  },

  formatDateDisplay(date) {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return `${m}月${d}日`;
  },

  getWeekday(date) {
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return weekdays[date.getDay()];
  },

  onMatchTap(e) {
    const matchId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/match/detail?id=${matchId}`
    });
  }
});