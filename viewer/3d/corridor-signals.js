import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {trafficSignalAsset} from './source-traffic-signal.js';

// Original placements are [east, north, yawRadians, unused]. Wc in the
// upstream app uses column 3 as rotation around ENU up, not a height.
export function createCorridorSignals(placements) {
  if (!Array.isArray(placements) || !placements.length) throw Error('Original traffic signal placements missing');
  const group = new THREE.Group(); group.name = 'Mapped traffic signals (static aspects)';
  const materials = new Map();
  const kit = {mat(color, options = {}) {
    const key = JSON.stringify([color, options]);
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({color, roughness: .8, ...options}));
    return materials.get(key);
  }};
  const asset = trafficSignalAsset.build({THREE, kit, detail: 'high'});
  asset.updateMatrixWorld(true);
  const byMaterial = new Map();
  asset.traverse(object => {
    if (!object.isMesh) return;
    const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld).rotateX(-Math.PI / 2);
    if (!byMaterial.has(object.material)) byMaterial.set(object.material, []);
    byMaterial.get(object.material).push(geometry);
    object.geometry.dispose();
  });
  const dummy = new THREE.Object3D();
  for (const [material, geometries] of byMaterial) {
    const geometry = mergeGeometries(geometries, false);
    for (const g of geometries) g.dispose();
    const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
    mesh.name = 'Source signal ' + material.color.getHexString();
    placements.forEach(([east, north, yaw = 0], index) => {
      if (![east, north, yaw].every(Number.isFinite)) throw Error('Invalid traffic signal placement');
      dummy.position.set(east, 0, -north); dummy.rotation.set(0, yaw, 0); dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); group.add(mesh);
  }
  group.userData = {count: placements.length, timed: false, source: 'scene-meta.json placements.traffic_signal', positions: 'Original ENU positions/yaw; flattened with existing roads and cars', dimensions: 'Original display model; not surveyed hardware'};
  return group;
}
