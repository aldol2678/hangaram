// 공개 블록아웃 미리보기용 PlayCanvas 호스트 (npm playcanvas, MIT).
// 청크 상태에 따라 블록아웃 primitive, 기존 KOREA 청크 자리, 계획·예약 셀 외곽선과 시대 지형을 그린다.
// 이동·충돌·스트리밍·상호작용·저장이 없는 검수용 뷰어이며 WorldForge 렌더러를 대체하지 않는다.

import * as pc from 'playcanvas';
import { assertEngineHost } from '../engine/host.js';
import { ORBIT_LIMITS, orbitCameraPosition, stepFocus } from './focus.js';

const STATUS_STYLE = {
  'legacy-reference': { fill: '#b9ad8a', opacity: 1, line: '#6f5f3e' },
  blockout: { fill: '#c9bb94', opacity: 1, line: '#3f6d5a' },
  planned: { fill: '#e4d3a2', opacity: 0.45, line: '#b4532a' },
  reserved: { fill: null, opacity: 0, line: '#8f8a80' },
};
const WATER_COLOR = '#5f8fa8';

function toColor(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  return new pc.Color(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export function createPlayCanvasPreviewHost(canvas, { bounds }) {
  const app = new pc.Application(canvas, { graphicsDeviceOptions: { antialias: true, alpha: false } });
  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const onResize = () => app.resizeCanvas();
  window.addEventListener('resize', onResize);

  app.scene.ambientLight = new pc.Color(0.58, 0.57, 0.55);
  const camera = new pc.Entity('preview.camera');
  camera.addComponent('camera', { clearColor: toColor('#ddd5c4'), fov: 50, nearClip: 0.3, farClip: 1500 });
  app.root.addChild(camera);
  const sun = new pc.Entity('preview.sun');
  sun.addComponent('light', { type: 'directional', intensity: 1.15, color: new pc.Color(1, 0.97, 0.9) });
  sun.setEulerAngles(55, 35, 0);
  app.root.addChild(sun);

  const materials = new Map();
  const material = (hex, opacity = 1) => {
    const key = `${hex}/${opacity}`;
    if (!materials.has(key)) {
      const m = new pc.StandardMaterial();
      m.diffuse = toColor(hex);
      if (opacity < 1) {
        m.opacity = opacity;
        m.blendType = pc.BLEND_NORMAL;
        m.depthWrite = false;
      }
      m.update();
      materials.set(key, m);
    }
    return materials.get(key);
  };
  const shape = (parent, name, type, position, size, hex, opacity = 1, yaw = 0) => {
    const e = new pc.Entity(name);
    e.addComponent('render', { type, material: material(hex, opacity), castShadows: false, receiveShadows: false });
    e.setLocalPosition(...position);
    e.setLocalScale(...size);
    if (yaw) e.setLocalEulerAngles(0, yaw, 0);
    parent.addChild(e);
    return e;
  };

  const focusMarker = new pc.Entity('preview.focus');
  shape(focusMarker, 'preview.focus.disc', 'cylinder', [0, 0.06, 0], [1.4, 0.12, 1.4], '#1f8a80');
  shape(focusMarker, 'preview.focus.pole', 'cylinder', [0, 0.9, 0], [0.18, 1.8, 0.18], '#1f8a80');
  app.root.addChild(focusMarker);

  const chunks = new Map();
  let terrainRoot = null;
  let lines = [];
  let lineColors = [];
  const view = { focus: [0, 8], yaw: 0, pitch: 38, distance: 46, overview: false };
  const saved = { pitch: view.pitch, distance: view.distance };
  let frames = 0;
  let lastFrame = null;

  function rebuildLines() {
    lines = [];
    lineColors = [];
    const y = 0.08;
    const push = (a, b, hex) => {
      const color = toColor(hex);
      lines.push(new pc.Vec3(a[0], y, a[1]), new pc.Vec3(b[0], y, b[1]));
      lineColors.push(color, color);
    };
    for (const { descriptor } of chunks.values()) {
      const { min, max } = descriptor.bounds;
      const hex = STATUS_STYLE[descriptor.status].line;
      const corners = [[min[0], min[1]], [max[0], min[1]], [max[0], max[1]], [min[0], max[1]]];
      for (let i = 0; i < 4; i++) {
        const a = corners[i];
        const b = corners[(i + 1) % 4];
        if (descriptor.status === 'planned') {
          // 계획 셀은 점선으로 구분한다.
          for (let t = 0; t < 1; t += 0.1) push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], [a[0] + (b[0] - a[0]) * (t + 0.05), a[1] + (b[1] - a[1]) * (t + 0.05)], hex);
        } else push(a, b, hex);
      }
    }
  }

  const host = assertEngineHost({
    capabilities: new Set(),
    setTerrain(terrain) {
      terrainRoot?.destroy();
      terrainRoot = new pc.Entity('preview.terrain');
      for (const water of terrain?.water ?? []) {
        const w = water.max[0] - water.min[0];
        const d = water.max[1] - water.min[1];
        shape(terrainRoot, water.id, 'box', [(water.min[0] + water.max[0]) / 2, water.surfaceY - 0.05, (water.min[1] + water.max[1]) / 2], [w, 0.1, d], WATER_COLOR, 0.85);
      }
      app.root.addChild(terrainRoot);
    },
    mountChunk(descriptor) {
      const root = new pc.Entity(`preview.chunk.${descriptor.qualifiedId}`);
      const style = STATUS_STYLE[descriptor.status];
      const { min, max } = descriptor.bounds;
      const center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2];
      if (style.fill) shape(root, `${descriptor.qualifiedId}.ground`, 'box', [center[0], -0.2, center[1]], [max[0] - min[0], 0.4, max[1] - min[1]], style.fill, style.opacity);
      for (const p of descriptor.blockout?.primitives ?? []) {
        shape(root, p.id, p.shape, p.position, p.size, p.color, 1, p.yaw ?? 0);
      }
      app.root.addChild(root);
      chunks.set(descriptor.qualifiedId, { descriptor, root });
      rebuildLines();
    },
    unmountChunk(qualifiedId) {
      chunks.get(qualifiedId)?.root.destroy();
      chunks.delete(qualifiedId);
      rebuildLines();
    },
    setFocus({ position, yaw }) {
      view.focus = [...position];
      view.yaw = yaw;
    },
    frame(frame, dt) {
      frames++;
      lastFrame = frame;
      if (frame.map) {
        view.overview = !view.overview;
        if (view.overview) {
          saved.pitch = view.pitch;
          saved.distance = view.distance;
          view.pitch = 80;
          view.distance = 270;
        } else {
          view.pitch = saved.pitch;
          view.distance = saved.distance;
        }
      }
      view.focus = stepFocus(view.focus, frame, { yaw: view.yaw, dt, bounds });
    },
    snapshot() {
      const device = app.graphicsDevice;
      return {
        backend: device.deviceType,
        isWebGL2: device.isWebGL2 === true,
        chunks: [...chunks.values()].map(({ descriptor }) => ({ id: descriptor.qualifiedId, status: descriptor.status, loadable: descriptor.loadable })),
        focus: [...view.focus],
        yaw: view.yaw,
        pitch: view.pitch,
        distance: view.distance,
        overview: view.overview,
        frames,
        lastFrame,
      };
    },
    dispose() {
      window.removeEventListener('resize', onResize);
      app.destroy();
    },
  });

  app.on('update', () => {
    focusMarker.setPosition(view.focus[0], 0, view.focus[1]);
    camera.setPosition(...orbitCameraPosition(view.focus, view));
    camera.lookAt(view.focus[0], 0, view.focus[1]);
    if (lines.length) app.drawLines(lines, lineColors, true);
  });

  return {
    host,
    app,
    start: () => app.start(),
    orbit(deltaYaw, deltaPitch) {
      view.yaw += deltaYaw;
      view.pitch = Math.max(ORBIT_LIMITS.minPitch, Math.min(ORBIT_LIMITS.maxPitch, view.pitch + deltaPitch));
    },
    zoom(factor) {
      view.distance = Math.max(ORBIT_LIMITS.minDistance, Math.min(ORBIT_LIMITS.maxDistance, view.distance * factor));
    },
    get yaw() {
      return view.yaw;
    },
    /** 청크 이름표의 화면 좌표. 화면 뒤쪽은 제외한다. */
    projectLabels() {
      const out = [];
      const screen = new pc.Vec3();
      const forward = camera.forward;
      const cameraPosition = camera.getPosition();
      for (const { descriptor } of chunks.values()) {
        const { min, max } = descriptor.bounds;
        const world = new pc.Vec3((min[0] + max[0]) / 2, 1, (min[1] + max[1]) / 2);
        const toPoint = new pc.Vec3().sub2(world, cameraPosition);
        if (toPoint.dot(forward) <= 0) continue;
        camera.camera.worldToScreen(world, screen);
        out.push({ id: descriptor.qualifiedId, name: descriptor.name, status: descriptor.status, label: descriptor.statusLabel, x: screen.x, y: screen.y });
      }
      return out;
    },
  };
}
