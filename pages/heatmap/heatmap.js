const app = getApp();
const predictApi = require("../../utils/predictApi");
const flagMapping = require("../../utils/flagMapping");

Page({
  data: {
    navHeight: 0,
    heatmapList: [],
    loading: true,
    adVisible: true
  },

  onLoad() {
    this.setData({ navHeight: app.globalData.navBarHeight });
    this.loadHeatmap();
  },

  loadHeatmap() {
    predictApi.getChampionStats().then(res => {
      if (res && res.ok && res.data) {
        const teams = res.data.teams || [];
        const total = res.data.total || 0;
        
        if (teams.length === 0 || total === 0) {
          this.setData({ heatmapList: [], loading: false });
          return;
        }

        // Sort by count descending
        const sorted = teams.sort((a, b) => b.count - a.count);
        
        // Get my prediction
        predictApi.getChampionMine().then(myRes => {
          const myTeamCode = myRes && myRes.ok && myRes.data ? myRes.data.team_code : null;
          
          const heatmapList = sorted.map((item, index) => {
            const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
            return {
              rank: index + 1,
              teamCode: item.team_code,
              teamName: item.team_name,
              flagUrl: flagMapping.getFlagUrl(item.team_code),
              count: item.count,
              percentage,
              barWidth: percentage,
              isMine: item.team_code === myTeamCode
            };
          });

          this.setData({
            heatmapList,
            loading: false
          });
        }).catch(() => {
          const heatmapList = sorted.map((item, index) => {
            const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
            return {
              rank: index + 1,
              teamCode: item.team_code,
              teamName: item.team_name,
              flagUrl: flagMapping.getFlagUrl(item.team_code),
              count: item.count,
              percentage,
              barWidth: percentage,
              isMine: false
            };
          });

          this.setData({
            heatmapList,
            loading: false
          });
        });
      } else {
        this.setData({ heatmapList: [], loading: false });
      }
    }).catch(() => {
      this.setData({ heatmapList: [], loading: false });
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
  },

  onAdHide() {
    this.setData({ adVisible: false });
  }
});