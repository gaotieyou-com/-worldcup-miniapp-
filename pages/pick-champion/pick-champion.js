const app = getApp();
const predictApi = require("../../utils/predictApi");
const flagMapping = require("../../utils/flagMapping");
const teamElimination = require("../../utils/teamElimination");
const matchStatus = require("../../utils/matchStatus");

Page({
  data: {
    navHeight: 0,
    keyword: "",
    filteredGroups: [],
    isEmpty: false,
    selectedCode: "",
    userTeamElimination: "",
    userTeamLabel: "",
    allTeams: [],
    allGroups: {}
  },

  onLoad() {
    this.setData({ navHeight: app.globalData.navBarHeight });
    this.loadData();
    this.loadCurrentPrediction();
  },

  loadData() {
    const tournamentData = app.getTournamentData();
    if (!tournamentData) return;

    const { teams, groups, matches } = tournamentData;

    // Compute elimination stage for each team
    const eliminationMap = this.computeEliminations(teams, matches);

    const allTeams = teams.map(t => {
      const elimStage = eliminationMap[t.code] || "alive";
      return {
        code: t.code,
        nameCn: t.nameCn,
        name: t.name,
        flag: t.flag,
        flagUrl: flagMapping.getFlagUrl(t.code),
        group: t.group,
        isEliminated: teamElimination.isEliminated(elimStage),
        eliminationStage: elimStage,
        eliminationLabel: teamElimination.getEliminationLabel(elimStage)
      };
    });

    this.setData({ allTeams, allGroups: groups });
    this.buildFilteredGroups();
  },

  computeEliminations(teams, matches) {
    // Simple elimination computation: check if a team lost a knockout match
    const result = {};
    teams.forEach(t => { result[t.code] = "alive"; });

    const MATCH_STATUS = matchStatus.MATCH_STATUS;
    matches.forEach(m => {
      if (m.stage === "group") return;
      const status = matchStatus.normalizeStatus(m.status);
      if (status !== MATCH_STATUS.FINISHED) return;
      if (!m.score || !m.score.ft) return;

      const homeScore = m.score.ft[0];
      const awayScore = m.score.ft[1];
      if (homeScore == null || awayScore == null) return;

      const winner = homeScore > awayScore ? m.home : m.away;
      const loser = homeScore > awayScore ? m.away : m.home;

      // Loser gets eliminated at this stage
      if (loser && loser !== "TBD") {
        let stage = "alive";
        if (m.stage === "r32") stage = "eliminated_r32";
        else if (m.stage === "r16") stage = "eliminated_r16";
        else if (m.stage === "quarter") stage = "eliminated_qf";
        else if (m.stage === "semi") stage = "eliminated_sf";
        else if (m.stage === "final") stage = "eliminated_final";
        else stage = "eliminated_r32";
        result[loser] = stage;
      }

      // Final winner is champion
      if (m.stage === "final" && winner && winner !== "TBD") {
        result[winner] = "champion";
      }
    });

    return result;
  },

  loadCurrentPrediction() {
    predictApi.getChampionMine().then(res => {
      if (res && res.ok && res.data) {
        const guess = predictApi.rowToGuess(res.data);
        if (guess) {
          const team = this.data.allTeams.find(t => t.code === guess.code);
          const elimStage = team ? team.eliminationStage : "alive";
          this.setData({
            selectedCode: guess.code,
            userTeamElimination: elimStage,
            userTeamLabel: teamElimination.getEliminationLabel(elimStage)
          });
        }
      }
    }).catch(() => {});
  },

  buildFilteredGroups() {
    const { allTeams, keyword } = this.data;

    let filtered = allTeams;
    if (keyword) {
      const lower = keyword.toLowerCase();
      filtered = allTeams.filter(t =>
        (t.nameCn || "").toLowerCase().includes(lower) ||
        (t.name || "").toLowerCase().includes(lower) ||
        (t.code || "").toLowerCase().includes(lower)
      );
    }

    // Group by group letter
    const groupMap = {};
    filtered.forEach(t => {
      const g = t.group || "其他";
      if (!groupMap[g]) groupMap[g] = [];
      groupMap[g].push(t);
    });

    const filteredGroups = Object.keys(groupMap).sort().map(g => ({
      group: g,
      teams: groupMap[g]
    }));

    this.setData({
      filteredGroups,
      isEmpty: filtered.length === 0
    });
  },

  onKeywordInput(e) {
    const keyword = e.detail.value.trim();
    this.setData({ keyword });
    this.buildFilteredGroups();
  },

  onClearKeyword() {
    this.setData({ keyword: "" });
    this.buildFilteredGroups();
  },

  onTeamTap(e) {
    const { code, name, stage } = e.currentTarget.dataset;
    if (!code) return;

    // Check if team is already selected
    if (code === this.data.selectedCode) return;

    // Check if team is eliminated
    if (stage && teamElimination.isEliminated(stage)) {
      wx.showToast({ title: "该球队已被淘汰", icon: "none" });
      return;
    }

    wx.showModal({
      title: "确认选择",
      content: `选择 ${name} 作为冠军预测？`,
      success: (res) => {
        if (res.confirm) {
          this.submitPrediction(code, name);
        }
      }
    });
  },

  submitPrediction(teamCode, teamName) {
    predictApi.postChampion(teamCode, teamName, "pick").then(res => {
      if (res && res.ok) {
        wx.showToast({ title: "预测成功", icon: "success" });
        this.setData({ selectedCode: teamCode });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else if (res && res.errorCode === 410) {
        const errorInfo = predictApi.describeChampionError(res);
        wx.showModal({
          title: "无法选择",
          content: errorInfo.message || "该球队已被淘汰",
          showCancel: false
        });
      } else if (res && res.errorCode === 409) {
        const errorInfo = predictApi.describeChampionError(res);
        wx.showModal({
          title: "无法修改",
          content: errorInfo.message || "决赛已开始，无法修改预测",
          showCancel: false
        });
      } else {
        wx.showToast({ title: "预测失败", icon: "none" });
      }
    }).catch(() => {
      wx.showToast({ title: "网络错误", icon: "none" });
    });
  }
});