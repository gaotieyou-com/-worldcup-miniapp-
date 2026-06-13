const app = getApp();
const predictApi = require("../../utils/predictApi");
const favoriteSync = require("../../utils/favoriteSync");
const flagMapping = require("../../utils/flagMapping");

Page({
  data: {
    navHeight: 0,
    userAvatar: "/images/avatars/01_绿茵先锋.png",
    userName: "球迷",
    guessTeam: null,
    predictMatchCount: 0,
    enableShareCard: true,
    tabs: [
      { key: "all", label: "全部", count: 0 },
      { key: "upcoming", label: "未开始", count: 0 },
      { key: "live", label: "进行中", count: 0 },
      { key: "finished", label: "已结束", count: 0 }
    ],
    activeTab: "all",
    filteredList: [],
    allFavorites: [],
    showPreview: false,
    showChampionPreview: false,
    emptyIcon: "/images/icons/star-gray.svg",
    emptyIconBg: "#f5f5f5",
    emptyTitle: "暂无收藏",
    emptySubtitle: "点击比赛详情中的星标收藏比赛",
    emptyBtnText: "去赛程",
    recommendApps: [
      { name: "地铁城市", appId: "wxcd9ee81d258e6749", icon: "🚇", bgColor: "#4A90D9", desc: "全国地铁线路查询" },
      { name: "归属地查询助手", appId: "wx0b7f6b0907dcdce8", icon: "📍", bgColor: "#E67E22", desc: "手机号归属地查询" },
      { name: "孵蛋查询洛克", appId: "wx7429c25b33819714", icon: "🥚", bgColor: "#27AE60", desc: "洛克王国孵蛋助手" },
      { name: "小黄鱼金价", appId: "wx565671487d869cfe", icon: "🐟", bgColor: "#F39C12", desc: "实时金价行情查询" },
      { name: "戒烟了么", appId: "wx8aa679fe0bd081f8", icon: "🚭", bgColor: "#2ECC71", desc: "戒烟打卡助手" }
    ]
  },

  onLoad() {
    this.setData({ navHeight: app.globalData.navBarHeight });
    this.loadUserInfo();
    this.loadChampionPrediction();
    this.loadMatchPredictions();
    this.loadFavorites();
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
    this.loadFavorites();
  },

  onShareAppMessage() {
    return {
      title: "2026世界杯 - 我的预测和收藏",
      path: "/pages/more/more"
    };
  },

  loadUserInfo() {
    // Try to get user info from storage or use defaults
    try {
      const userInfo = wx.getStorageSync("userInfo");
      if (userInfo) {
        this.setData({
          userAvatar: userInfo.avatarUrl || this.data.userAvatar,
          userName: userInfo.nickName || this.data.userName
        });
      }
    } catch (e) {}
  },

  loadChampionPrediction() {
    predictApi.getChampionMine().then(res => {
      if (res && res.ok && res.data) {
        const guess = predictApi.rowToGuess(res.data);
        if (guess) {
          this.setData({ guessTeam: guess });
        }
      }
    }).catch(() => {});
  },

  loadMatchPredictions() {
    predictApi.getMatchMineList().then(res => {
      if (res && res.ok && res.data) {
        const predictions = res.data.predictions || [];
        this.setData({ predictMatchCount: predictions.length });
      }
    }).catch(() => {});
  },

  loadFavorites() {
    favoriteSync.getFavorites().then(favorites => {
      if (!favorites || !Array.isArray(favorites)) {
        this.setData({ allFavorites: [], filteredList: [] });
        return;
      }

      const tournamentData = app.getTournamentData();
      if (!tournamentData) return;

      const { matches } = tournamentData;
      const favoriteMatches = favorites.map(id => {
        return matches.find(m => m.id === id);
      }).filter(Boolean);

      this.setData({ allFavorites: favoriteMatches });
      this.filterFavorites();
    }).catch(() => {});
  },

  filterFavorites() {
    const { allFavorites, activeTab } = this.data;
    const matchStatus = require("../../utils/matchStatus");
    
    let filtered = allFavorites;
    if (activeTab !== "all") {
      filtered = allFavorites.filter(m => {
        const status = matchStatus.normalizeStatus(m.status);
        if (activeTab === "upcoming") return status === matchStatus.MATCH_STATUS.SCHEDULED;
        if (activeTab === "live") return status === matchStatus.MATCH_STATUS.LIVE;
        if (activeTab === "finished") return status === matchStatus.MATCH_STATUS.FINISHED;
        return true;
      });
    }

    // Update tab counts
    const tabs = this.data.tabs.map(tab => {
      if (tab.key === "all") return { ...tab, count: allFavorites.length };
      const count = allFavorites.filter(m => {
        const status = matchStatus.normalizeStatus(m.status);
        if (tab.key === "upcoming") return status === matchStatus.MATCH_STATUS.SCHEDULED;
        if (tab.key === "live") return status === matchStatus.MATCH_STATUS.LIVE;
        if (tab.key === "finished") return status === matchStatus.MATCH_STATUS.FINISHED;
        return false;
      }).length;
      return { ...tab, count };
    });

    this.setData({ filteredList: filtered, tabs });
  },

  onTabTap(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ activeTab: key });
    this.filterFavorites();
  },

  onFavChange(e) {
    const { matchId, isFavorite } = e.detail;
    if (!isFavorite) {
      // Remove from list with animation
      const filteredList = this.data.filteredList.map(m => {
        if (m.id === matchId) return { ...m, _removing: true };
        return m;
      });
      this.setData({ filteredList });
      
      setTimeout(() => {
        this.loadFavorites();
      }, 300);
    }
  },

  onAvatarTap() {
    this.setData({ showPreview: true });
  },

  onClosePreview() {
    this.setData({ showPreview: false });
  },

  onPreviewContentTap() {
    // Do nothing, prevent closing when tapping content
  },

  onSwitchProfile() {
    wx.showActionSheet({
      itemList: ["选择头像", "修改昵称"],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.chooseAvatar();
        } else if (res.tapIndex === 1) {
          this.changeNickname();
        }
      }
    });
  },

  chooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: (res) => {
        const avatarUrl = res.tempFilePaths[0];
        this.setData({ userAvatar: avatarUrl });
        try {
          wx.setStorageSync("userInfo", {
            ...wx.getStorageSync("userInfo"),
            avatarUrl
          });
        } catch (e) {}
      }
    });
  },

  changeNickname() {
    wx.showModal({
      title: "修改昵称",
      editable: true,
      placeholderText: "请输入昵称",
      success: (res) => {
        if (res.confirm && res.content) {
          this.setData({ userName: res.content });
          try {
            wx.setStorageSync("userInfo", {
              ...wx.getStorageSync("userInfo"),
              nickName: res.content
            });
          } catch (e) {}
        }
      }
    });
  },

  onGuessTap() {
    wx.navigateTo({
      url: "/pages/pick-champion/pick-champion"
    });
  },

  onPredictMatchTap() {
    wx.navigateTo({
      url: "/pages/predict-list/predict-list"
    });
  },

  onChangeChampion() {
    this.setData({ showChampionPreview: false });
    wx.navigateTo({
      url: "/pages/pick-champion/pick-champion"
    });
  },

  onCloseChampionPreview() {
    this.setData({ showChampionPreview: false });
  },

  onChampionContentTap() {
    // Do nothing, prevent closing when tapping content
  },

  onEmptyAction() {
    wx.switchTab({
      url: "/pages/schedule/schedule"
    });
  },

  onRecommendTap(e) {
    const index = e.currentTarget.dataset.index;
    const app = this.data.recommendApps[index];
    if (app && app.appId) {
      wx.navigateToMiniProgram({
        appId: app.appId,
        path: "",
        extraData: {},
        envVersion: "release",
        success() {},
        fail() {
          wx.showToast({ title: "打开失败", icon: "none" });
        }
      });
    }
  }
});