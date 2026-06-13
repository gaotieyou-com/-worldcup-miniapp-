var t = require("./utils/dataSync"),
  a = require("./utils/builtin-data"),
  e = require("./utils/flagMapping"),
  n = require("./utils/appUpdate"),
  i = require("./utils/favoriteSync"),
  o = require("./utils/predictApi");
App({
  globalData: {
    tournamentData: null,
    syncedAt: null,
    navBarHeight: 0,
    statusBarHeight: 0,
    menuButtonHeight: 0,
    menuButtonTop: 0,
    menuButtonMargin: 0,
    featureFlags: null,
  },
  onLaunch: function () {
    this.initNavBar(),
      this.initData(),
      (this.globalData.featureFlags = t.getFeatureFlags()),
      e.initFlagCache(),
      n.checkVersion(),
      this.migrateFavoritesIfNeeded();
  },
  initNavBar: function () {
    var t = wx.getWindowInfo(),
      a = wx.getMenuButtonBoundingClientRect(),
      e = t.statusBarHeight,
      n = a.height,
      i = a.top,
      o = i - e,
      r = e + 20; // 减少顶部预留到20px
    (this.globalData.statusBarHeight = e),
      (this.globalData.menuButtonHeight = n),
      (this.globalData.menuButtonTop = i),
      (this.globalData.menuButtonMargin = 0), // 移除额外间距
      (this.globalData.navBarHeight = r);
  },
  onShow: function () {
    var a = this;
    t
      .checkUpdate(!1)
      .then(function (t) {
        t && a.loadLocalData();
      })
      .catch(function () {}),
      t
        .fetchFeatureFlags()
        .then(function (t) {
          a.globalData.featureFlags = t;
        })
        .catch(function (t) {
          console.warn(
            "[app.onShow] feature flags fetch unexpectedly rejected:",
            t
          );
        });
  },
  initData: function () {
    var e = t.getLocalData();
    e
      ? ((this.globalData.tournamentData = e),
        (this.globalData.syncedAt = wx.getStorageSync("wc2026_syncedAt")))
      : ((this.globalData.tournamentData = a.getData()),
        (this.globalData.syncedAt = "内置数据"));
  },
  loadLocalData: function () {
    var a = t.getLocalData();
    a &&
      ((this.globalData.tournamentData = a),
      (this.globalData.syncedAt = wx.getStorageSync("wc2026_syncedAt")));
  },
  migrateFavoritesIfNeeded: function () {
    var t = !1,
      a = [];
    try {
      t = !!wx.getStorageSync("favMigratedV1");
      var e = wx.getStorageSync("favMatches");
      Array.isArray(e) &&
        (a = e.filter(function (t) {
          return !!t;
        }));
    } catch (t) {}
    if (t || 0 === a.length) {
      if (t && a.length > 0)
        try {
          wx.removeStorageSync("favMatches");
        } catch (t) {}
      i.syncFavorites().catch(function () {});
    } else
      o.postFavoriteBatch(a)
        .then(function (t) {
          if (t && t.ok) {
            try {
              wx.setStorageSync("favMigratedV1", !0);
            } catch (t) {}
            try {
              wx.removeStorageSync("favMatches");
            } catch (t) {}
            i.writeCache(a.slice().reverse()),
              i.syncFavorites({ force: !0 }).catch(function () {});
          }
        })
        .catch(function () {});
  },
  getTournamentData: function () {
    return this.globalData.tournamentData;
  },
  getSyncedAt: function () {
    return this.globalData.syncedAt;
  },
});
