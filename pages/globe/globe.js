const app = getApp();
const predictApi = require("../../utils/predictApi");
const flagMapping = require("../../utils/flagMapping");

Page({
  data: {
    allTeams: [],
    showPickHint: false,
    pickHintTeam: "",
    isUserTeamDead: false,
    userTeamDeadLabel: "",
    visitedGuess: null
  },

  onLoad() {
    this.loadTeams();
    this.loadCurrentPrediction();
  },

  loadTeams() {
    const tournamentData = app.getTournamentData();
    if (!tournamentData) return;

    const { teams } = tournamentData;
    const allTeams = teams.map(t => ({
      code: t.code,
      nameCn: t.nameCn,
      name: t.name,
      flag: t.flag,
      flagUrl: flagMapping.getFlagUrl(t.code),
      group: t.group
    }));

    this.setData({ allTeams });
  },

  loadCurrentPrediction() {
    predictApi.getChampionMine().then(res => {
      if (res && res.ok && res.data) {
        const guess = predictApi.rowToGuess(res.data);
        if (guess) {
          this.setData({
            visitedGuess: guess,
            pickHintTeam: guess.nameCn
          });
        }
      }
    }).catch(() => {});
  },

  onGlobePick(e) {
    const team = e.detail.team;
    if (team) {
      this.setData({
        showPickHint: true,
        pickHintTeam: team.nameCn
      });
    }
  },

  onGlobeConfirm(e) {
    const team = e.detail.team;
    if (!team) return;

    wx.showModal({
      title: "确认选择",
      content: `选择 ${team.nameCn} 作为冠军预测？`,
      success: (res) => {
        if (res.confirm) {
          this.submitPrediction(team);
        }
      }
    });
  },

  submitPrediction(team) {
    predictApi.postChampion(team.code, team.nameCn, "rand").then(res => {
      if (res && res.ok) {
        wx.showToast({
          title: "预测成功",
          icon: "success"
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: "预测失败",
          icon: "none"
        });
      }
    }).catch(() => {
      wx.showToast({
        title: "网络错误",
        icon: "none"
      });
    });
  },

  onGlobeClose() {
    wx.navigateBack();
  }
});