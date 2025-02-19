// Camera.js
export class Camera {
  constructor(videoElement, options) {
    this.videoElement = videoElement;
    this.options = options;
  }

  async start() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: this.options.width,
          height: this.options.height
        }
      });

      this.videoElement.srcObject = stream;
      this.videoElement.onloadedmetadata = () => {
        this.videoElement.play();
        this.loop();
      };
    }
  }

  loop() {
    if (this.options.onFrame) {
      this.options.onFrame();
    }
    requestAnimationFrame(() => this.loop());
  }

  stop() {
    if (this.videoElement.srcObject) {
      this.videoElement.srcObject.getTracks().forEach(track => track.stop());
    }
  }
}
