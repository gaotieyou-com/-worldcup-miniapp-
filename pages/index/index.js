const app = getApp();
const dataSync = require("../../utils/dataSync");
const predictApi = require("../../utils/predictApi");
const flagMapping = require("../../utils/flagMapping");
const matchStatus = require("../../utils/matchStatus");

Page({
  data: {
    navHeight: 0,
    hostFlags: [],
    todayMatches: [],
    recentSchedule: [],
    openingMatch: null,
    finalMatch: null,
    playedMatchesCount: 0,
    totalMatchesCount: 0,
    remainingMatchesCount: 0,
    selectedGuessTeamName: "",
    selectedGuessFlagUrl: "",
    selectedGuessSource: "",
    selectedTeamCode: "",
    userTeamElimination: "",
    userTeamLabel: "",
    championHeatmap: [],
    championTotalCount: 0,
    predictEnabled: true,
    userTeamInHeatmapTop3: true,
    featureFlags: {},
    adVisible: true
  },

  onLoad() {
    this.setData({ navHeight: app.globalData.navBarHeight });
    this.initData();
    this.loadChampionPrediction();
    this.loadChampionHeatmap();
  },

  onShow() {
    // Update tab bar
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  onPullDownRefresh() {
    dataSync.checkUpdate(true).then((updated) => {
      if (updated) {
        this.initData();
      }
      wx.stopPullDownRefresh();
    }).catch(() => {
      wx.stopPullDownRefresh();
    });
  },

  onShareAppMessage() {
    return {
      title: "2026世界杯 - 赛程、积分榜、冠军预测",
      path: "/pages/index/index"
    };
  },

  initData() {
    const tournamentData = app.getTournamentData();
    if (!tournamentData) return;

    const { matches, teams } = tournamentData;
    
    // Get host flags (USA, Canada, Mexico)
    const hostCodes = ["USA", "CAN", "MEX"];
    const hostFlags = hostCodes.map(code => ({
      code,
      name: teams.find(t => t.code === code)?.nameCn || code,
      url: flagMapping.getFlagUrl(code)
    }));

    // Get today's matches and recent matches
    const today = dataSync.todayBeijing();
    const todayMatches = matches.filter(m => {
      const matchDate = this.getMatchBeijingDate(m);
      return matchDate === today && matchStatus.normalizeStatus(m.status) === matchStatus.MATCH_STATUS.SCHEDULED;
    }).slice(0, 5);

    // Get opening match
    const openingMatch = matches.find(m => m.id === 1) || matches[0];
    
    // Get final match
    const finalMatch = matches.find(m => m.stage === "final") || matches[matches.length - 1];

    // Count played matches
    const playedMatchesCount = matches.filter(m => 
      matchStatus.normalizeStatus(m.status) === matchStatus.MATCH_STATUS.FINISHED
    ).length;

    // Count total matches and remaining
    const totalMatchesCount = matches.length;
    const remainingMatchesCount = totalMatchesCount - playedMatchesCount;

    // Get recent schedule (today and tomorrow matches)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = this.formatDate(tomorrow);
    
    const recentSchedule = matches.filter(m => {
      const matchDate = this.getMatchBeijingDate(m);
      return (matchDate === today || matchDate === tomorrowStr) && 
             matchStatus.normalizeStatus(m.status) === matchStatus.MATCH_STATUS.SCHEDULED;
    }).slice(0, 6).map(m => {
      const homeTeam = teams.find(t => t.name === m.home || t.code === m.home);
      const awayTeam = teams.find(t => t.name === m.away || t.code === m.away);
      const beijingTime = this.getMatchBeijingTime(m);
      return {
        id: m.id,
        homeCode: homeTeam ? homeTeam.code : m.home,
        awayCode: awayTeam ? awayTeam.code : m.away,
        homeName: homeTeam ? homeTeam.nameCn : m.home,
        awayName: awayTeam ? awayTeam.nameCn : m.away,
        homeFlagUrl: homeTeam ? flagMapping.getFlagUrl(homeTeam.code) : null,
        awayFlagUrl: awayTeam ? flagMapping.getFlagUrl(awayTeam.code) : null,
        time: beijingTime,
        date: this.getMatchBeijingDate(m)
      };
    });

    this.setData({
      hostFlags,
      todayMatches,
      recentSchedule,
      openingMatch,
      finalMatch,
      playedMatchesCount,
      totalMatchesCount,
      remainingMatchesCount,
      featureFlags: app.globalData.featureFlags || {}
    });

    // Inject predict counts
    predictApi.injectPredictCounts(todayMatches, this, "todayMatches");
  },

  getMatchBeijingDate(match) {
    if (!match || !match.date || !match.time) return "";
    const timezone = require("../../utils/timezone");
    const result = timezone.convertByVenue(match.time, match.date, match.venue);
    return result ? result.date : match.date;
  },

  formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  },

  getMatchBeijingTime(match) {
    if (!match || !match.time) return "";
    const timezone = require("../../utils/timezone");
    const result = timezone.convertByVenue(match.time, match.date, match.venue);
    return result ? result.time : match.time;
  },

  loadChampionPrediction() {
    predictApi.getChampionMine().then(res => {
      if (res && res.ok && res.data) {
        const guess = predictApi.rowToGuess(res.data);
        if (guess) {
          this.setData({
            selectedGuessTeamName: guess.nameCn,
            selectedGuessFlagUrl: guess.flagUrl,
            selectedGuessSource: guess.source,
            selectedTeamCode: guess.code
          });
        }
      }
    }).catch(() => {});
  },

  loadChampionHeatmap() {
    predictApi.getChampionStats().then(res => {
      if (res && res.ok && res.data) {
        const teams = res.data.teams || [];
        const total = res.data.total || 0;
        
        if (teams.length === 0 || total === 0) {
          this.setData({ championHeatmap: [], championTotalCount: 0 });
          return;
        }

        // Sort by count descending
        const sorted = teams.sort((a, b) => b.count - a.count);
        
        // Take top 3
        const top3 = sorted.slice(0, 3).map(item => {
          const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
          return {
            teamCode: item.team_code,
            teamName: item.team_name,
            flagUrl: flagMapping.getFlagUrl(item.team_code),
            count: item.count,
            percentage,
            barWidth: percentage
          };
        });

        this.setData({
          championHeatmap: top3,
          championTotalCount: total
        });
      }
    }).catch(() => {});
  },

  onGuessTap() {
    wx.navigateTo({
      url: "/pages/pick-champion/pick-champion"
    });
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