// Define base64 content helper
// TODO: Find a base64 content helper library?
var base64CanvasEl = document.createElement('canvas');
var base64Context = base64CanvasEl.getContext('2d');
exports.getBase64Content = function (imgEl) {
  // Resize our canvas to target size
  var width = base64CanvasEl.width = imgEl.naturalWidth;
  var height = base64CanvasEl.height = imgEl.naturalHeight;

  // Clear our canvas to prevent legacy artifacts
  // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/clearRect
  // TODO: Test me that we clear legacy artifacts properly
  base64Context.clearRect(0, 0, width, height);

  // Draw our image and return its data URL
  // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
  // https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL
  // DEV: We use `image/png` for lossless encoding which is necessary for visual comparison
  base64Context.drawImage(imgEl, 0, 0);
  return base64CanvasEl.toDataURL('image/png');
};
