const app = getApp();
const predictApi = require("../../utils/predictApi");
const flagMapping = require("../../utils/flagMapping");

const TEMPLATES = [
  { id: "fire", name: "火焰", previewBg: "linear-gradient(135deg,#ff6b35,#c62828)", locked: false, _unlocked: true },
  { id: "gold", name: "金色", previewBg: "linear-gradient(135deg,#ffd54f,#ff8f00)", locked: false, _unlocked: true },
  { id: "ocean", name: "海洋", previewBg: "linear-gradient(135deg,#0288d1,#01579b)", locked: false, _unlocked: true },
  { id: "metal", name: "金属", previewBg: "linear-gradient(135deg,#78909c,#37474f)", locked: true, _unlocked: false },
  { id: "stadium", name: "体育场", previewBg: "linear-gradient(135deg,#1a5c3a,#0D3B2E)", locked: true, _unlocked: false }
];

Page({
  data: {
    navHeight: 0,
    templates: TEMPLATES,
    selectedTemplate: TEMPLATES[0],
    selectedIndex: 0,
    isLocked: false,
    guessTeam: null,
    userAvatar: "",
    userName: "球迷",
    adVisible: true,
    generating: false,
    showSuccess: false
  },

  onLoad() {
    this.setData({ navHeight: app.globalData.navBarHeight });
    this.loadUserInfo();
    this.loadChampionPrediction();
  },

  loadUserInfo() {
    try {
      const userInfo = wx.getStorageSync("userInfo");
      if (userInfo) {
        this.setData({
          userName: userInfo.nickName || "球迷",
          userAvatar: userInfo.avatarUrl || ""
        });
      }
    } catch (e) {}
    // Also try to get avatar from app.globalData
    if (!this.data.userAvatar && app.globalData && app.globalData.userInfo) {
      this.setData({
        userAvatar: app.globalData.userInfo.avatarUrl || "",
        userName: app.globalData.userInfo.nickName || this.data.userName
      });
    }
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

  onTemplateTap(e) {
    const index = e.currentTarget.dataset.index;
    const tpl = this.data.templates[index];
    if (!tpl) return;
    const isLocked = tpl.locked && !tpl._unlocked;
    this.setData({
      selectedIndex: index,
      selectedTemplate: tpl,
      isLocked: isLocked
    });
  },

  onUnlockTap() {
    // Show rewarded video ad to unlock template
    const that = this;
    const videoAd = wx.createRewardedVideoAd && wx.createRewardedVideoAd({ adUnitId: "adunit-1d1e145ee87fc6cd" });
    if (!videoAd) {
      // If ad API not available, just unlock
      that._unlockCurrentTemplate();
      return;
    }
    videoAd.onClose((res) => {
      if (res && res.isEnded) {
        that._unlockCurrentTemplate();
      } else {
        wx.showToast({ title: "需要看完视频才能解锁", icon: "none" });
      }
    });
    videoAd.onError(() => {
      // If ad fails, unlock anyway for better UX
      that._unlockCurrentTemplate();
    });
    videoAd.show().catch(() => {
      that._unlockCurrentTemplate();
    });
  },

  _unlockCurrentTemplate() {
    const index = this.data.selectedIndex;
    const key = `templates[${index}]._unlocked`;
    this.setData({
      [key]: true,
      isLocked: false
    });
    wx.showToast({ title: "解锁成功", icon: "success" });
  },

  onAdLoad() {
    this.setData({ adVisible: true });
  },

  onAdError() {
    this.setData({ adVisible: false });
  },

  onGenerate() {
    if (this.data.isLocked) {
      wx.showToast({ title: "请先解锁模板", icon: "none" });
      return;
    }
    if (this.data.generating) return;
    this.setData({ generating: true });

    const that = this;
    const query = wx.createSelectorQuery();
    query.select("#posterCanvas")
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          that.setData({ generating: false });
          wx.showToast({ title: "生成失败", icon: "none" });
          return;
        }

        const canvas = res[0].node;
        const ctx = canvas.getContext("2d");
        const dpr = wx.getSystemInfoSync().pixelRatio || 2;
        canvas.width = 750 * dpr;
        canvas.height = 600 * dpr;
        ctx.scale(dpr, dpr);

        that._drawPoster(ctx, canvas);

        setTimeout(() => {
          wx.canvasToTempFilePath({
            canvas: canvas,
            destWidth: 750 * dpr,
            destHeight: 600 * dpr,
            success: (fileRes) => {
              wx.saveImageToPhotosAlbum({
                filePath: fileRes.tempFilePath,
                success: () => {
                  that.setData({ generating: false, showSuccess: true });
                },
                fail: (err) => {
                  that.setData({ generating: false });
                  if (err.errMsg && err.errMsg.indexOf("auth deny") !== -1) {
                    wx.showModal({
                      title: "提示",
                      content: "需要授权保存图片到相册",
                      confirmText: "去设置",
                      success: (modalRes) => {
                        if (modalRes.confirm) wx.openSetting();
                      }
                    });
                  } else {
                    wx.showToast({ title: "保存失败", icon: "none" });
                  }
                }
              });
            },
            fail: () => {
              that.setData({ generating: false });
              wx.showToast({ title: "生成失败", icon: "none" });
            }
          });
        }, 200);
      });
  },

  _drawPoster(ctx, canvas) {
    const { selectedTemplate, guessTeam, userName, userAvatar } = this.data;
    const W = 750, H = 600;

    // Background gradient based on template
    const tplId = selectedTemplate.id;
    const gradient = ctx.createLinearGradient(0, 0, W, H);
    if (tplId === "fire") {
      gradient.addColorStop(0, "#ff6b35");
      gradient.addColorStop(1, "#c62828");
    } else if (tplId === "gold") {
      gradient.addColorStop(0, "#ffd54f");
      gradient.addColorStop(1, "#ff8f00");
    } else if (tplId === "ocean") {
      gradient.addColorStop(0, "#0288d1");
      gradient.addColorStop(1, "#01579b");
    } else if (tplId === "metal") {
      gradient.addColorStop(0, "#78909c");
      gradient.addColorStop(1, "#37474f");
    } else {
      gradient.addColorStop(0, "#1a5c3a");
      gradient.addColorStop(1, "#0D3B2E");
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("2026 世界杯", W / 2, 80);

    ctx.font = "24px sans-serif";
    ctx.fillText("我的冠军预测", W / 2, 120);

    // Champion team
    if (guessTeam) {
      // Flag circle
      ctx.beginPath();
      ctx.arc(W / 2, 230, 50, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fill();

      ctx.font = "48px sans-serif";
      ctx.fillText(guessTeam.flag || "🏆", W / 2, 245);

      ctx.font = "bold 32px sans-serif";
      ctx.fillText(guessTeam.nameCn + " 夺冠", W / 2, 310);
    }

    // User info row
    ctx.font = "20px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(userName || "球迷", W / 2, 400);

    // Footer
    ctx.font = "16px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText("长按识别小程序码", W / 2, 560);
  },

  onCloseSuccess() {
    this.setData({ showSuccess: false });
  },

  onGoShare() {
    this.setData({ showSuccess: false });
    // Trigger share via button (page has a share button or we can open share menu)
    wx.showShareMenu && wx.showShareMenu({ withShareTicket: true, menus: ["shareAppMessage", "shareTimeline"] });
  },

  onShareAppMessage() {
    return {
      title: "我预测了" + (this.data.guessTeam ? this.data.guessTeam.nameCn : "冠军") + "夺冠！2026世界杯",
      path: "/pages/index/index"
    };
  }
});
