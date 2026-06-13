const app = getApp();
const predictApi = require("../../utils/predictApi");
const favoriteSync = require("../../utils/favoriteSync");
const matchStatus = require("../../utils/matchStatus");
const timezone = require("../../utils/timezone");
const standingsCalc = require("../../utils/standingsCalc");
const flagMapping = require("../../utils/flagMapping");

Page({
  data: {
    navHeight: 0,
    match: null,
    homeTeam: null,
    awayTeam: null,
    homeIsTbd: false,
    awayIsTbd: false,
    homeTbdLines: [],
    awayTbdLines: [],
    homeTbdDesc: "",
    awayTbdDesc: "",
    scoreDisplay: "VS",
    isLive: false,
    isFinished: false,
    statusClass: "",
    statusText: "",
    beijingDate: "",
    beijingTimeOnly: "",
    venueDisplay: "",
    attendanceText: "",
    isGroupStage: false,
    groupStandings: [],
    isFavorite: false,
    navTitle: "",
    predictEnabled: true,
    predictState: "input", // input | submitted | locked
    myHomeScore: 0,
    myAwayScore: 0,
    submitting: false,
    predictDistinctCount: 0,
    showCalendarBtn: true,
    addedToCalendar: false,
    isTbd: false,
    calendarBtnClass: "",
    adVisible: true,
    matchPredictStats: [],
    matchPredictTotal: 0
  },

  onLoad(options) {
    this.setData({ navHeight: app.globalData.navBarHeight });
    const matchId = options.id;
    if (!matchId) {
      wx.navigateBack();
      return;
    }
    this.loadMatch(matchId);
    this.loadPrediction(matchId);
    this.checkFavorite(matchId);
  },

  onShow() {
    // Refresh data if needed
  },

  loadMatch(matchId) {
    const tournamentData = app.getTournamentData();
    if (!tournamentData) return;

    const { matches, teams, standings } = tournamentData;
    const match = matches.find(m => m.id == matchId);
    if (!match) {
      wx.navigateBack();
      return;
    }

    const status = matchStatus.normalizeStatus(match.status);
    const MATCH_STATUS = matchStatus.MATCH_STATUS;
    const isLive = status === MATCH_STATUS.LIVE;
    const isFinished = status === MATCH_STATUS.FINISHED;
    const isGroupStage = match.stage === "group";

    // Get teams
    const homeTeam = teams.find(t => t.code === match.home);
    const awayTeam = teams.find(t => t.code === match.away);

    // Check if TBD
    const homeIsTbd = !match.home || match.home === "TBD";
    const awayIsTbd = !match.away || match.away === "TBD";

    // Score display
    let scoreDisplay = "VS";
    if (match.score && match.score.ft) {
      scoreDisplay = `${match.score.ft[0]} - ${match.score.ft[1]}`;
    }

    // Status
    let statusClass = "";
    let statusText = "";
    if (isLive) {
      statusClass = "live";
      statusText = "进行中";
    } else if (isFinished) {
      statusClass = "finished";
      statusText = "已结束";
    } else {
      statusText = "未开始";
    }

    // Beijing time
    const beijingTime = timezone.convertByVenue(match.time, match.date, match.venue);
    const beijingDate = beijingTime ? beijingTime.date : match.date;
    const beijingTimeOnly = beijingTime ? beijingTime.time : match.time;

    // Venue
    const venueDisplay = match.venue || "待定";

    // Group standings
    let groupStandings = [];
    if (isGroupStage && match.group) {
      const calculatedStandings = standingsCalc.mergeStandingsFromMatches(standings, matches);
      groupStandings = (calculatedStandings[match.group] || []).map(team => ({
        ...team,
        goalDiffText: standingsCalc.formatGoalDiff(team.goalDiff)
      }));
    }

    // TBD descriptions
    let homeTbdDesc = "";
    let awayTbdDesc = "";
    let homeTbdLines = [];
    let awayTbdLines = [];

    if (homeIsTbd) {
      homeTbdDesc = match.homePlaceholder || "待定";
      homeTbdLines = homeTbdDesc.split("/");
    }
    if (awayIsTbd) {
      awayTbdDesc = match.awayPlaceholder || "待定";
      awayTbdLines = awayTbdDesc.split("/");
    }

    this.setData({
      match,
      homeTeam,
      awayTeam,
      homeIsTbd,
      awayIsTbd,
      homeTbdLines,
      awayTbdLines,
      homeTbdDesc,
      awayTbdDesc,
      scoreDisplay,
      isLive,
      isFinished,
      statusClass,
      statusText,
      beijingDate,
      beijingTimeOnly,
      venueDisplay,
      isGroupStage,
      groupStandings,
      isTbd: homeIsTbd || awayIsTbd,
      navTitle: homeTeam && awayTeam ? `${homeTeam.nameCn} vs ${awayTeam.nameCn}` : "比赛详情"
    });
  },

  loadPrediction(matchId) {
    predictApi.getMatchMine(matchId).then(res => {
      if (res && res.ok && res.data && res.data.prediction) {
        const pred = res.data.prediction;
        this.setData({
          predictState: "submitted",
          myHomeScore: pred.home_score,
          myAwayScore: pred.away_score
        });
      } else {
        // Check if match is locked (already started)
        const match = this.data.match;
        if (match && matchStatus.isMatchStarted(match)) {
          this.setData({ predictState: "locked" });
        } else {
          this.setData({ predictState: "input" });
        }
      }
      this.loadPredictStats(matchId);
    }).catch(() => {
      this.setData({ predictState: "input" });
      this.loadPredictStats(matchId);
    });
  },

  loadPredictStats(matchId) {
    predictApi.getMatchStats(matchId).then(res => {
      if (res && res.ok && res.data) {
        const stats = res.data;
        const distribution = stats.distribution || {};
        const total = stats.total || 0;
        const myScore = `${this.data.myHomeScore}-${this.data.myAwayScore}`;
        
        const matchPredictStats = [];
        Object.keys(distribution).forEach(score => {
          const count = distribution[score];
          if (count > 0) {
            matchPredictStats.push({
              score,
              count,
              percentage: total > 0 ? Math.round((count / total) * 100) : 0,
              isMine: score === myScore
            });
          }
        });

        // Sort by count descending, assign bar width relative to max
        matchPredictStats.sort((a, b) => b.count - a.count);
        const maxCount = matchPredictStats.length > 0 ? matchPredictStats[0].count : 1;
        matchPredictStats.forEach(item => {
          item.barWidth = Math.round((item.count / maxCount) * 100);
        });

        this.setData({
          matchPredictStats: matchPredictStats,
          matchPredictTotal: total,
          predictDistinctCount: matchPredictStats.length
        });
      }
    }).catch(() => {});
  },

  checkFavorite(matchId) {
    favoriteSync.isFavorite(matchId).then(isFavorite => {
      this.setData({ isFavorite });
    }).catch(() => {});
  },

  onFavoriteTap() {
    const { match, isFavorite } = this.data;
    if (!match) return;

    if (isFavorite) {
      favoriteSync.removeFavorite(match.id).then(() => {
        this.setData({ isFavorite: false });
        wx.showToast({ title: "已取消收藏", icon: "none" });
      }).catch(() => {});
    } else {
      favoriteSync.addFavorite(match.id).then(() => {
        this.setData({ isFavorite: true });
        wx.showToast({ title: "已收藏", icon: "none" });
      }).catch(() => {});
    }
  },

  onScoreChange(e) {
    const { delta, side } = e.currentTarget.dataset;
    const { myHomeScore, myAwayScore } = this.data;
    
    if (side === "home") {
      const newScore = myHomeScore + parseInt(delta);
      if (newScore >= 0 && newScore <= 9) {
        this.setData({ myHomeScore: newScore });
      }
    } else {
      const newScore = myAwayScore + parseInt(delta);
      if (newScore >= 0 && newScore <= 9) {
        this.setData({ myAwayScore: newScore });
      }
    }
  },

  onSubmitPredict() {
    const { match, myHomeScore, myAwayScore, submitting } = this.data;
    if (!match || submitting) return;

    this.setData({ submitting: true });
    
    predictApi.postMatch(match.id, myHomeScore, myAwayScore, {
      homeTeamName: this.data.homeTeam?.nameCn,
      awayTeamName: this.data.awayTeam?.nameCn,
      matchDate: match.date,
      matchTime: match.time
    }).then(res => {
      this.setData({ submitting: false });
      if (res && res.ok) {
        this.setData({ predictState: "submitted" });
        wx.showToast({ title: "预测成功", icon: "success" });
      } else {
        wx.showToast({ title: "预测失败", icon: "none" });
      }
    }).catch(() => {
      this.setData({ submitting: false });
      wx.showToast({ title: "网络错误", icon: "none" });
    });
  },

  onEditPredict() {
    this.setData({ predictState: "input" });
  },

  onPredictDistTap() {
    const { match } = this.data;
    if (match) {
      wx.navigateTo({
        url: `/pages/predict-dist/predict-dist?id=${match.id}`
      });
    }
  },

  onCalendarTap() {
    const { match, addedToCalendar, isTbd } = this.data;
    if (!match || addedToCalendar || isTbd) return;

    // Add to calendar (simplified)
    this.setData({ addedToCalendar: true });
    wx.showToast({ title: "已添加到日历", icon: "success" });
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