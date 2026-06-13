const app = getApp();

Page({
  data: {
    navHeight: 0,
    keyword: "",
    pageState: "browse", // browse | search
    groupList: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"],
    activeGroup: "A",
    currentGroupTeams: [],
    searchResults: [],
    adVisible: true
  },

  onLoad() {
    this.setData({ navHeight: app.globalData.navBarHeight });
    this.loadGroupTeams();
  },

  loadGroupTeams() {
    const tournamentData = app.getTournamentData();
    if (!tournamentData) return;

    const { teams, groups } = tournamentData;
    const activeGroup = this.data.activeGroup;
    const group = groups[activeGroup];
    
    if (!group) return;
    
    const currentGroupTeams = group.teams.map(code => {
      const team = teams.find(t => t.code === code);
      return team || { code, nameCn: code, name: code, group: activeGroup };
    });

    this.setData({ currentGroupTeams });
  },

  onGroupTap(e) {
    const group = e.currentTarget.dataset.group;
    this.setData({ activeGroup: group });
    this.loadGroupTeams();
  },

  onSearchInput(e) {
    const keyword = e.detail.value.trim();
    this.setData({ keyword });
    
    if (keyword) {
      this.setData({ pageState: "search" });
      this.searchTeams(keyword);
    } else {
      this.setData({ pageState: "browse", searchResults: [] });
    }
  },

  onSearchConfirm(e) {
    const keyword = e.detail.value.trim();
    if (keyword) {
      this.searchTeams(keyword);
    }
  },

  onClearSearch() {
    this.setData({
      keyword: "",
      pageState: "browse",
      searchResults: []
    });
  },

  searchTeams(keyword) {
    const tournamentData = app.getTournamentData();
    if (!tournamentData) return;

    const { teams } = tournamentData;
    const lowerKeyword = keyword.toLowerCase();
    
    const searchResults = teams.filter(team => {
      const nameCn = (team.nameCn || "").toLowerCase();
      const name = (team.name || "").toLowerCase();
      const code = (team.code || "").toLowerCase();
      
      return nameCn.includes(lowerKeyword) || 
             name.includes(lowerKeyword) || 
             code.includes(lowerKeyword);
    });

    this.setData({ searchResults });
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