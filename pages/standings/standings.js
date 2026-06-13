const app = getApp();
const dataSync = require("../../utils/dataSync");
const standingsCalc = require("../../utils/standingsCalc");

Page({
  data: {
    navHeight: 0,
    groups: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"],
    selectedGroup: "A",
    currentStandings: [],
    adVisible: true
  },

  onLoad() {
    this.setData({ navHeight: app.globalData.navBarHeight });
    this.loadStandings();
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
  },

  onPullDownRefresh() {
    dataSync.checkUpdate(true).then((updated) => {
      if (updated) {
        this.loadStandings();
      }
      wx.stopPullDownRefresh();
    }).catch(() => {
      wx.stopPullDownRefresh();
    });
  },

  loadStandings() {
    const tournamentData = app.getTournamentData();
    if (!tournamentData) return;

    const { standings, matches } = tournamentData;
    
    // Calculate standings from matches
    const calculatedStandings = standingsCalc.mergeStandingsFromMatches(standings, matches);
    
    const selectedGroup = this.data.selectedGroup;
    const currentStandings = calculatedStandings[selectedGroup] || [];
    
    // Format goal difference
    const formattedStandings = currentStandings.map(team => ({
      ...team,
      goalDiffText: standingsCalc.formatGoalDiff(team.goalDiff)
    }));

    this.setData({ currentStandings: formattedStandings });
  },

  onGroupSelect(e) {
    const group = e.currentTarget.dataset.group;
    this.setData({ selectedGroup: group });
    this.loadStandings();
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
  },

  onAdHide() {
    this.setData({ adVisible: false });
  }
});