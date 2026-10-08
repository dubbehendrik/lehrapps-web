import { detectFibers } from "./detection";
self.onmessage = ({ data }) => {
  try {
    self.postMessage({
      fibers: detectFibers(data.rgba, data.width, data.height, data.image),
    });
  } catch (e) {
    self.postMessage({ error: String(e) });
  }
};
