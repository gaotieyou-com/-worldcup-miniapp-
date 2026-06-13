const app = getApp();
const matchStatus = require("../../utils/matchStatus");
const timezone = require("../../utils/timezone");
const flagMapping = require("../../utils/flagMapping");

Page({
  data: {
    navHeight: 0,
    team: null,
    teamCode: "",
    teamName: "",
    teamFlag: "",
    teamMatches: [],
    loading: true
  },

  onLoad(options) {
    this.setData({ navHeight: app.globalData.navBarHeight });
    const teamCode = options.code;
    if (!teamCode) {
      wx.navigateBack();
      return;
    }
    this.setData({ teamCode });
    this.loadTeam(teamCode);
  },

  loadTeam(teamCode) {
    const tournamentData = app.getTournamentData();
    if (!tournamentData) return;

    const { teams, matches } = tournamentData;
    const team = teams.find(t => t.code === teamCode);
    if (!team) {
      wx.navigateBack();
      return;
    }

    // Get team matches
    const teamMatches = matches.filter(m => 
      m.home === teamCode || m.away === teamCode
    ).map(m => {
      const homeTeam = teams.find(t => t.code === m.home);
      const awayTeam = teams.find(t => t.code === m.away);
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
        homeTeam,
        awayTeam,
        scoreText,
        statusText,
        statusClass,
        isLive,
        isFinished,
        dateShort: m.date ? m.date.slice(5) : "",
        time: m.time || ""
      };
    });

    this.setData({
      team,
      teamName: team.nameCn || team.name,
      teamFlag: team.flag || "🏳️",
      teamMatches,
      loading: false
    });
  },

  onMatchTap(e) {
    const matchId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/match/detail?id=${matchId}`
    });
  }
});