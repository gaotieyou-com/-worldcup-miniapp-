const app = getApp();
const predictApi = require("../../utils/predictApi");
const matchStatus = require("../../utils/matchStatus");
const timezone = require("../../utils/timezone");

Page({
  data: {
    navHeight: 0,
    matchId: "",
    homeCode: "",
    awayCode: "",
    homeName: "",
    awayName: "",
    kickoff: "",
    distList: [],
    totalCount: 0,
    myScore: "",
    loading: true,
    loadError: false,
    adVisible: true
  },

  onLoad(options) {
    this.setData({ navHeight: app.globalData.navBarHeight });
    const matchId = options.id;
    if (!matchId) {
      wx.navigateBack();
      return;
    }
    this.setData({ matchId });
    this.loadMatchInfo(matchId);
    this.loadDistribution(matchId);
  },

  loadMatchInfo(matchId) {
    const tournamentData = app.getTournamentData();
    if (!tournamentData) return;

    const { matches, teams } = tournamentData;
    const match = matches.find(m => m.id == matchId);
    if (!match) return;

    const homeTeam = teams.find(t => t.code === match.home);
    const awayTeam = teams.find(t => t.code === match.away);
    const beijingTime = timezone.convertByVenue(match.time, match.date, match.venue);
    const kickoff = beijingTime ? `${beijingTime.date} ${beijingTime.time}` : `${match.date} ${match.time}`;

    this.setData({
      homeCode: match.home || "",
      awayCode: match.away || "",
      homeName: homeTeam ? homeTeam.nameCn : (match.homePlaceholder || "主队"),
      awayName: awayTeam ? awayTeam.nameCn : (match.awayPlaceholder || "客队"),
      kickoff
    });
  },

  loadDistribution(matchId) {
    this.setData({ loading: true, loadError: false });

    // Load stats and my prediction in parallel
    Promise.all([
      predictApi.getMatchStats(matchId),
      predictApi.getMatchMine(matchId)
    ]).then(([statsRes, mineRes]) => {
      let myScore = "";
      if (mineRes && mineRes.ok && mineRes.data && mineRes.data.prediction) {
        const pred = mineRes.data.prediction;
        myScore = `${pred.home_score}-${pred.away_score}`;
      }

      if (statsRes && statsRes.ok && statsRes.data) {
        const stats = statsRes.data;
        const totalCount = stats.total || 0;
        const distribution = stats.distribution || {};

        const distList = [];
        Object.keys(distribution).forEach(score => {
          const count = distribution[score];
          if (count > 0) {
            distList.push({
              score,
              count,
              percentage: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0,
              isMine: score === myScore
            });
          }
        });

        // Sort by count descending
        distList.sort((a, b) => b.count - a.count);

        // Assign rank and bar width
        const maxCount = distList.length > 0 ? distList[0].count : 1;
        distList.forEach((item, index) => {
          item.rank = index + 1;
          item.barWidth = Math.round((item.count / maxCount) * 100);
        });

        this.setData({
          distList,
          totalCount,
          myScore,
          loading: false
        });
      } else {
        this.setData({ distList: [], totalCount: 0, loading: false, loadError: true });
      }
    }).catch(() => {
      this.setData({ distList: [], totalCount: 0, loading: false, loadError: true });
    });
  },

  onPullDownRefresh() {
    this.loadDistribution(this.data.matchId);
    wx.stopPullDownRefresh();
  },

  onAdLoad() {
    this.setData({ adVisible: true });
  },

  onAdError(e) {
    this.setData({ adVisible: false });
  },

  onAdClose() {
    this.setData({ adVisible: false });
  }
});