Component({
  properties: {
    teams: {
      type: Array,
      value: []
    },
    showPickHint: {
      type: Boolean,
      value: false
    },
    pickHintTeam: {
      type: String,
      value: ""
    },
    isUserTeamDead: {
      type: Boolean,
      value: false
    },
    userTeamDeadLabel: {
      type: String,
      value: ""
    },
    visitedGuess: {
      type: Object,
      value: null
    }
  },
  data: {
    canvas: null,
    gl: null,
    rotation: 0,
    selectedTeam: null,
    touchStartX: 0,
    touchStartY: 0,
    isDragging: false
  },
  lifetimes: {
    attached() {
      this.initGlobe();
    },
    detached() {
      this.cleanup();
    }
  },
  methods: {
    initGlobe() {
      // Simplified globe initialization
      // In a real implementation, this would use WebGL
      console.log("Globe component initialized");
    },
    
    cleanup() {
      // Cleanup resources
      console.log("Globe component cleanup");
    },
    
    onTouchStart(e) {
      const touch = e.touches[0];
      this.setData({
        touchStartX: touch.clientX,
        touchStartY: touch.clientY,
        isDragging: true
      });
    },
    
    onTouchMove(e) {
      if (!this.data.isDragging) return;
      
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.data.touchStartX;
      
      this.setData({
        rotation: this.data.rotation + deltaX * 0.5,
        touchStartX: touch.clientX,
        touchStartY: touch.clientY
      });
    },
    
    onTouchEnd(e) {
      this.setData({ isDragging: false });
      
      // Simple team selection based on touch position
      if (this.data.teams && this.data.teams.length > 0) {
        const touch = e.changedTouches[0];
        const teamIndex = Math.floor(Math.random() * this.data.teams.length);
        const selectedTeam = this.data.teams[teamIndex];
        
        this.setData({ selectedTeam });
        this.triggerEvent("pick", { team: selectedTeam });
      }
    },
    
    onClose() {
      this.triggerEvent("close");
    },
    
    onConfirm() {
      if (this.data.selectedTeam) {
        this.triggerEvent("confirm", { team: this.data.selectedTeam });
      }
    }
  }
});