import { segmentImage } from "./segmentation";
import { detectFibers } from "./detection";
self.onmessage = ({ data }) => {
  try {
    if (data.preview) {
      self.postMessage({
        mask: segmentImage(data.rgba, data.width, data.height, data.image),
      });
    } else
      self.postMessage({
        fibers: detectFibers(data.rgba, data.width, data.height, data.image),
      });
  } catch (e) {
    self.postMessage({ error: String(e) });
  }
};
