const app = getApp();
const matchStatus = require("../../utils/matchStatus");
const timezone = require("../../utils/timezone");
const flagMapping = require("../../utils/flagMapping");

Page({
  data: {
    statusBarHeight: 0,
    groups: [],
    leftCols: [],
    rightCols: [],
    finalMatch: null,
    thirdMatch: null,
    lines: [],
    bracketZoom: 1,
    bracketContentHeight: 0,
    wrapperHeight: 0,
    activeGroupPopup: null,
    groupPopupMatches: [],
    activeKOPopup: null,
    koPopupData: {}
  },

  onLoad() {
    const app = getApp();
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight
    });
    this.loadBracket();
  },

  loadBracket() {
    const tournamentData = app.getTournamentData();
    if (!tournamentData) return;

    const { matches, teams, groups } = tournamentData;

    // Load groups
    const groupsData = Object.keys(groups).map(name => {
      const group = groups[name];
      const groupTeams = group.teams.map(code => {
        const team = teams.find(t => t.code === code);
        return {
          code,
          cn: team ? team.nameCn : code,
          flag: team ? team.flag : "🏳️"
        };
      });
      
      // Generate accent color based on group name
      const colors = ["#e53935", "#8e24aa", "#1e88e5", "#43a047", "#fb8c00", "#00acc1", "#6d4c41", "#546e7a", "#d81b60", "#5e35b1", "#039be5", "#7cb342"];
      const accent = colors[name.charCodeAt(0) - 65] || "#666";
      
      return { name, teams: groupTeams, accent };
    });

    // Load knockout matches
    const koMatches = matches.filter(m => m.stage !== "group");
    
    // Split into left and right columns
    // Left: R32 (matches 73-88), R16 (matches 89-96), QF (matches 97-100)
    // Right: SF (matches 101-102), Final (104), Third (103)
    
    const leftCols = [
      {
        label: "32强",
        cls: "r32-col",
        matches: this.formatKOMatches(koMatches.filter(m => m.id >= 73 && m.id <= 88), teams)
      },
      {
        label: "16强",
        cls: "r16-col",
        matches: this.formatKOMatches(koMatches.filter(m => m.id >= 89 && m.id <= 96), teams)
      },
      {
        label: "8强",
        cls: "qf-col",
        matches: this.formatKOMatches(koMatches.filter(m => m.id >= 97 && m.id <= 100), teams)
      }
    ];

    const rightCols = [
      {
        label: "半决赛",
        cls: "sf-col",
        matches: this.formatKOMatches(koMatches.filter(m => m.id >= 101 && m.id <= 102), teams)
      }
    ];

    const finalMatch = this.formatKOMatch(koMatches.find(m => m.id === 104), teams);
    const thirdMatch = this.formatKOMatch(koMatches.find(m => m.id === 103), teams);

    this.setData({
      groups: groupsData,
      leftCols,
      rightCols,
      finalMatch,
      thirdMatch
    });
  },

  formatKOMatches(matches, teams) {
    return matches.map(m => this.formatKOMatch(m, teams));
  },

  formatKOMatch(match, teams) {
    if (!match) return null;

    const homeTeam = teams.find(t => t.code === match.home);
    const awayTeam = teams.find(t => t.code === match.away);
    const status = matchStatus.normalizeStatus(match.status);
    const MATCH_STATUS = matchStatus.MATCH_STATUS;
    const isFinished = status === MATCH_STATUS.FINISHED;

    let homeScore = "";
    let awayScore = "";
    let hasScore = false;
    let homeWinner = false;
    let awayWinner = false;

    if (match.score && match.score.ft) {
      homeScore = match.score.ft[0];
      awayScore = match.score.ft[1];
      hasScore = true;
      if (isFinished) {
        homeWinner = homeScore > awayScore;
        awayWinner = awayScore > homeScore;
      }
    }

    return {
      num: match.id,
      home: {
        name: homeTeam ? homeTeam.nameCn : (match.homePlaceholder || "待定"),
        flag: homeTeam ? homeTeam.flag : "🏆",
        score: homeScore,
        hasScore,
        winner: homeWinner,
        placeholder: !match.home || match.home === "TBD"
      },
      away: {
        name: awayTeam ? awayTeam.nameCn : (match.awayPlaceholder || "待定"),
        flag: awayTeam ? awayTeam.flag : "🏆",
        score: awayScore,
        hasScore,
        winner: awayWinner,
        placeholder: !match.away || match.away === "TBD"
      }
    };
  },

  onGroupCardTap(e) {
    const group = e.currentTarget.dataset.group;
    const tournamentData = app.getTournamentData();
    if (!tournamentData) return;

    const { matches, teams } = tournamentData;
    const groupMatches = matches.filter(m => m.group === group).map(m => {
      const homeTeam = teams.find(t => t.code === m.home);
      const awayTeam = teams.find(t => t.code === m.away);
      const status = matchStatus.normalizeStatus(m.status);
      const MATCH_STATUS = matchStatus.MATCH_STATUS;
      const isLive = status === MATCH_STATUS.LIVE;
      const isFinished = status === MATCH_STATUS.FINISHED;

      let scoreText = "";
      let showScore = false;
      if (m.score && m.score.ft) {
        scoreText = `${m.score.ft[0]} - ${m.score.ft[1]}`;
        showScore = true;
      }

      let statusText = "";
      if (isLive) statusText = "进行中";
      else if (isFinished) statusText = "已结束";

      return {
        id: m.id,
        homeTeam,
        awayTeam,
        dateShort: m.date ? m.date.slice(5) : "",
        weekday: this.getWeekday(m.date),
        time: m.time || "",
        scoreText,
        showScore,
        isLive,
        isFinished,
        statusText
      };
    });

    this.setData({
      activeGroupPopup: group,
      groupPopupMatches: groupMatches
    });
  },

  onCloseGroupPopup() {
    this.setData({ activeGroupPopup: null });
  },

  onKOTap(e) {
    const num = e.currentTarget.dataset.num;
    const tournamentData = app.getTournamentData();
    if (!tournamentData) return;

    const { matches, teams } = tournamentData;
    const match = matches.find(m => m.id === num);
    if (!match) return;

    const homeTeam = teams.find(t => t.code === match.home);
    const awayTeam = teams.find(t => t.code === match.away);
    const status = matchStatus.normalizeStatus(match.status);
    const MATCH_STATUS = matchStatus.MATCH_STATUS;
    const isLive = status === MATCH_STATUS.LIVE;
    const isFinished = status === MATCH_STATUS.FINISHED;
    const hasResult = match.home && match.home !== "TBD";

    let homeScore = "";
    let awayScore = "";
    if (match.score && match.score.ft) {
      homeScore = match.score.ft[0];
      awayScore = match.score.ft[1];
    }

    let statusText = "";
    if (isLive) statusText = "进行中";
    else if (isFinished) statusText = "已结束";
    else statusText = "未开赛";

    const stageText = this.getStageText(match.stage);
    const beijingTime = timezone.convertByVenue(match.time, match.date, match.venue);

    this.setData({
      activeKOPopup: num,
      koPopupData: {
        stageText,
        homeTeam,
        awayTeam,
        homePlaceholder: match.homePlaceholder,
        awayPlaceholder: match.awayPlaceholder,
        homeScore,
        awayScore,
        hasResult,
        isLive,
        isFinished,
        statusText,
        time: match.time || "",
        dateFull: beijingTime ? `${beijingTime.date} ${beijingTime.time}` : match.date,
        venue: match.venue,
        venueDisplay: match.venue || "待定"
      }
    });
  },

  onCloseKOPopup() {
    this.setData({ activeKOPopup: null });
  },

  onBack() {
    wx.navigateBack();
  },

  noop() {
    // Do nothing
  },

  getWeekday(date) {
    if (!date) return "";
    const d = new Date(date);
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return weekdays[d.getDay()];
  },

  getStageText(stage) {
    const stageMap = {
      "r32": "32强赛",
      "r16": "16强赛",
      "quarter": "8强赛",
      "semi": "半决赛",
      "third": "三四名决赛",
      "final": "决赛"
    };
    return stageMap[stage] || stage;
  }
});