const app = getApp();
const predictApi = require("../../utils/predictApi");
const favoriteSync = require("../../utils/favoriteSync");
const matchStatus = require("../../utils/matchStatus");
const timezone = require("../../utils/timezone");
const flagMapping = require("../../utils/flagMapping");

Page({
  data: {
    navHeight: 0,
    loading: true,
    noOpenid: false,
    loadError: false,
    count: 0,
    displayList: [],
    activeTab: "all",
    adVisible: true,
    modalVisible: false,
    modalMatchId: "",
    modalHomeName: "",
    modalAwayName: "",
    modalInitial: { homeScore: 0, awayScore: 0 },
    modalMatchDate: "",
    modalMatchTime: "",
    modalMatchWeekday: ""
  },

  onLoad() {
    this.setData({ navHeight: app.globalData.navBarHeight });
    this.loadPredictions();
  },

  onShow() {
    this.loadPredictions();
  },

  onPullDownRefresh() {
    this.loadPredictions();
    wx.stopPullDownRefresh();
  },

  loadPredictions() {
    this.setData({ loading: true, loadError: false });

    predictApi.getMatchMineList().then(res => {
      if (!res || !res.ok) {
        if (res && res.errorCode === "NO_OPENID") {
          this.setData({ loading: false, noOpenid: true });
        } else {
          this.setData({ loading: false, loadError: true });
        }
        return;
      }

      const predictions = res.data && res.data.predictions ? res.data.predictions : [];
      const tournamentData = app.getTournamentData();

      if (!tournamentData) {
        this.setData({ loading: false, displayList: [], count: 0 });
        return;
      }

      const { matches, teams } = tournamentData;

      const displayList = predictions.map(pred => {
        const match = matches.find(m => m.id === pred.match_id);
        if (!match) return null;

        const homeTeam = teams.find(t => t.code === match.home);
        const awayTeam = teams.find(t => t.code === match.away);
        const status = matchStatus.normalizeStatus(match.status);
        const MATCH_STATUS = matchStatus.MATCH_STATUS;
        const isLocked = status !== MATCH_STATUS.SCHEDULED;

        const beijingTime = timezone.convertByVenue(match.time, match.date, match.venue);
        const dateLabel = beijingTime ? beijingTime.date.slice(5) : (match.date || "").slice(5);
        const timeLabel = beijingTime ? beijingTime.time : (match.time || "");
        const stageLabel = match.group ? `${match.group}组` : this.getStageLabel(match.stage);

        const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
        let matchWeekday = "";
        if (match.date) {
          const d = new Date(match.date);
          matchWeekday = weekdays[d.getDay()];
        }

        return {
          match_id: pred.match_id,
          home_score: pred.home_score,
          away_score: pred.away_score,
          homeCode: match.home || "",
          awayCode: match.away || "",
          dateLabel,
          timeLabel,
          stageLabel,
          locked: isLocked,
          matchDate: match.date || "",
          matchTime: match.time || "",
          matchWeekday
        };
      }).filter(Boolean);

      this.setData({
        displayList,
        count: displayList.length,
        loading: false
      });
    }).catch(() => {
      this.setData({ loading: false, loadError: true });
    });
  },

  getStageLabel(stage) {
    const map = {
      "r32": "32强",
      "r16": "16强",
      "quarter": "8强",
      "semi": "半决赛",
      "third": "三四名",
      "final": "决赛"
    };
    return map[stage] || "";
  },

  onCardTap(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({ url: `/pages/match/detail?id=${id}` });
    }
  },

  onTeamTap(e) {
    const code = e.currentTarget.dataset.code;
    if (code) {
      wx.navigateTo({ url: `/pages/team/detail?code=${code}` });
    }
  },

  onEditTap(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.displayList.find(d => d.match_id == id);
    if (!item || item.locked) return;

    this.setData({
      modalVisible: true,
      modalMatchId: item.match_id,
      modalHomeName: item.homeCode,
      modalAwayName: item.awayCode,
      modalInitial: { homeScore: item.home_score, awayScore: item.away_score },
      modalMatchDate: item.matchDate,
      modalMatchTime: item.matchTime,
      modalMatchWeekday: item.matchWeekday
    });
  },

  onCloseModal() {
    this.setData({ modalVisible: false });
  },

  onModalSubmit(e) {
    const { matchId, homeScore, awayScore } = e.detail || {};
    const { modalMatchId, modalHomeName, modalAwayName, modalMatchDate, modalMatchTime, modalMatchWeekday } = this.data;
    const mid = matchId || modalMatchId;

    predictApi.postMatch(mid, homeScore, awayScore, {
      homeTeamName: modalHomeName,
      awayTeamName: modalAwayName,
      matchDate: modalMatchDate,
      matchTime: modalMatchTime,
      matchWeekday: modalMatchWeekday
    }).then(res => {
      this.setData({ modalVisible: false });
      if (res && res.ok) {
        wx.showToast({ title: "修改成功", icon: "success" });
        this.loadPredictions();
      } else {
        wx.showToast({ title: "修改失败", icon: "none" });
      }
    }).catch(() => {
      this.setData({ modalVisible: false });
      wx.showToast({ title: "网络错误", icon: "none" });
    });
  },

  onGoSchedule() {
    wx.switchTab({ url: "/pages/schedule/schedule" });
  },

  onBack() {
    wx.navigateBack();
  },

  noop() {},

  onAdLoad() {
    this.setData({ adVisible: true });
  },

  onAdError(e) {
    this.setData({ adVisible: false });
  },

  onAdClose() {
    this.setData({ adVisible: false });
  },

  onAdHide() {
    this.setData({ adVisible: false });
  }
});