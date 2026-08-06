import { readFileSync, writeFileSync } from "node:fs";

const MODEL_DIR = "public/assets/road-madness/models";

const GL = {
  ARRAY_BUFFER: 34962,
  ELEMENT_ARRAY_BUFFER: 34963,
  FLOAT: 5126,
  UNSIGNED_SHORT: 5123,
  TRIANGLES: 4,
};

const MATERIALS = {
  derby: {
    body: {
      name: "cyber cyan chipped derby paint",
      pbrMetallicRoughness: {
        baseColorFactor: [0.02, 0.78, 0.95, 1],
        metallicFactor: 0.18,
        roughnessFactor: 0.46,
      },
      emissiveFactor: [0, 0.055, 0.075],
    },
    wheel: {
      name: "black rubber cyan rim",
      pbrMetallicRoughness: {
        baseColorFactor: [0.018, 0.02, 0.024, 1],
        metallicFactor: 0.05,
        roughnessFactor: 0.82,
      },
    },
    armor: {
      name: "scratched graphite armor",
      pbrMetallicRoughness: {
        baseColorFactor: [0.03, 0.035, 0.04, 1],
        metallicFactor: 0.55,
        roughnessFactor: 0.34,
      },
    },
    glow: {
      name: "cyan neon underglow",
      pbrMetallicRoughness: {
        baseColorFactor: [0, 0.92, 1, 0.78],
        metallicFactor: 0,
        roughnessFactor: 0.12,
      },
      emissiveFactor: [0, 0.85, 1],
      alphaMode: "BLEND",
      doubleSided: true,
    },
  },
  monster: {
    body: {
      name: "blood red battered monster paint",
      pbrMetallicRoughness: {
        baseColorFactor: [0.92, 0.04, 0.025, 1],
        metallicFactor: 0.2,
        roughnessFactor: 0.48,
      },
      emissiveFactor: [0.055, 0.006, 0],
    },
    wheel: {
      name: "chunky black rubber red rim",
      pbrMetallicRoughness: {
        baseColorFactor: [0.018, 0.016, 0.015, 1],
        metallicFactor: 0.04,
        roughnessFactor: 0.88,
      },
    },
    armor: {
      name: "burnt steel crash armor",
      pbrMetallicRoughness: {
        baseColorFactor: [0.032, 0.028, 0.025, 1],
        metallicFactor: 0.62,
        roughnessFactor: 0.36,
      },
    },
    glow: {
      name: "red neon lamps",
      pbrMetallicRoughness: {
        baseColorFactor: [1, 0.06, 0.02, 0.82],
        metallicFactor: 0,
        roughnessFactor: 0.14,
      },
      emissiveFactor: [1, 0.12, 0.02],
      alphaMode: "BLEND",
      doubleSided: true,
    },
  },
};

function box(name, center, size, material) {
  return { name, center, size, material };
}

function pad4(value) {
  return (value + 3) & ~3;
}

function readGlb(path) {
  const file = readFileSync(path);
  if (file.toString("utf8", 0, 4) !== "glTF") throw new Error(`${path} is not a GLB`);
  const jsonLength = file.readUInt32LE(12);
  const jsonType = file.toString("utf8", 16, 20);
  if (jsonType !== "JSON") throw new Error(`${path} has unexpected first chunk ${jsonType}`);
  const json = JSON.parse(file.subarray(20, 20 + jsonLength).toString("utf8").trim());
  const binHeader = 20 + pad4(jsonLength);
  const binLength = file.readUInt32LE(binHeader);
  const binType = file.toString("utf8", binHeader + 4, binHeader + 8);
  if (binType !== "BIN\0") throw new Error(`${path} has unexpected binary chunk ${binType}`);
  const bin = file.subarray(binHeader + 8, binHeader + 8 + binLength);
  return { json, bin };
}

function writeGlb(path, json, bin) {
  const jsonBuffer = Buffer.from(JSON.stringify(json));
  const paddedJsonLength = pad4(jsonBuffer.length);
  const paddedBinLength = pad4(bin.length);
  const out = Buffer.alloc(12 + 8 + paddedJsonLength + 8 + paddedBinLength, 0x20);
  out.write("glTF", 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(paddedJsonLength, 12);
  out.write("JSON", 16);
  jsonBuffer.copy(out, 20);
  const binHeader = 20 + paddedJsonLength;
  out.writeUInt32LE(paddedBinLength, binHeader);
  out.write("BIN\0", binHeader + 4);
  bin.copy(out, binHeader + 8);
  writeFileSync(path, out);
}

function appendBuffer(bin, bytes) {
  const start = pad4(bin.length);
  const prefix = start === bin.length ? bin : Buffer.concat([bin, Buffer.alloc(start - bin.length)]);
  return { nextBin: Buffer.concat([prefix, bytes]), byteOffset: start };
}

function makeBoxGeometry(center, size) {
  const [cx, cy, cz] = center;
  const [sx, sy, sz] = size.map((value) => value / 2);
  const corners = {
    nnn: [cx - sx, cy - sy, cz - sz],
    nnp: [cx - sx, cy - sy, cz + sz],
    npn: [cx - sx, cy + sy, cz - sz],
    npp: [cx - sx, cy + sy, cz + sz],
    pnn: [cx + sx, cy - sy, cz - sz],
    pnp: [cx + sx, cy - sy, cz + sz],
    ppn: [cx + sx, cy + sy, cz - sz],
    ppp: [cx + sx, cy + sy, cz + sz],
  };
  const faces = [
    [["pnp", "pnn", "ppn", "ppp"], [1, 0, 0]],
    [["nnn", "nnp", "npp", "npn"], [-1, 0, 0]],
    [["npn", "npp", "ppp", "ppn"], [0, 1, 0]],
    [["nnp", "nnn", "pnn", "pnp"], [0, -1, 0]],
    [["nnp", "pnp", "ppp", "npp"], [0, 0, 1]],
    [["pnn", "nnn", "npn", "ppn"], [0, 0, -1]],
  ];
  const positions = [];
  const normals = [];
  const indices = [];
  for (const [faceCorners, normal] of faces) {
    const base = positions.length / 3;
    for (const key of faceCorners) {
      positions.push(...corners[key]);
      normals.push(...normal);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return { positions, normals, indices };
}

function bufferFromFloat32(values) {
  const out = Buffer.alloc(values.length * 4);
  values.forEach((value, index) => out.writeFloatLE(value, index * 4));
  return out;
}

function bufferFromUint16(values) {
  const out = Buffer.alloc(values.length * 2);
  values.forEach((value, index) => out.writeUInt16LE(value, index * 2));
  return out;
}

function bounds(values) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let index = 0; index < values.length; index += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], values[index + axis]);
      max[axis] = Math.max(max[axis], values[index + axis]);
    }
  }
  return { min, max };
}

function addAccessor(json, binState, values, componentType, type, target) {
  const bytes = componentType === GL.FLOAT ? bufferFromFloat32(values) : bufferFromUint16(values);
  const appended = appendBuffer(binState.bin, bytes);
  binState.bin = appended.nextBin;
  const bufferView = json.bufferViews.push({
    buffer: 0,
    byteOffset: appended.byteOffset,
    byteLength: bytes.length,
    target,
  }) - 1;
  const accessor = {
    bufferView,
    componentType,
    count: type === "VEC3" ? values.length / 3 : values.length,
    type,
  };
  if (type === "VEC3") Object.assign(accessor, bounds(values));
  return json.accessors.push(accessor) - 1;
}

function readVec3Accessor(json, bin, accessorIndex) {
  const accessor = json.accessors[accessorIndex];
  const view = json.bufferViews[accessor.bufferView];
  if (accessor.componentType !== GL.FLOAT || accessor.type !== "VEC3") {
    throw new Error(`Expected VEC3 float accessor ${accessorIndex}`);
  }
  const byteStride = view.byteStride ?? 12;
  const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const values = [];
  for (let index = 0; index < accessor.count; index += 1) {
    const base = offset + index * byteStride;
    values.push(bin.readFloatLE(base), bin.readFloatLE(base + 4), bin.readFloatLE(base + 8));
  }
  return values;
}

function emptyBounds() {
  return {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
}

function expandBounds(target, point) {
  for (let axis = 0; axis < 3; axis += 1) {
    target.min[axis] = Math.min(target.min[axis], point[axis]);
    target.max[axis] = Math.max(target.max[axis], point[axis]);
  }
}

function mergeBounds(target, source) {
  expandBounds(target, source.min);
  expandBounds(target, source.max);
}

function boundSize(bound, axis) {
  return bound.max[axis] - bound.min[axis];
}

function boundCenter(bound, axis) {
  return (bound.min[axis] + bound.max[axis]) / 2;
}

function computeModelBounds(json, bin) {
  const all = emptyBounds();
  const body = emptyBounds();
  const wheels = emptyBounds();
  const visited = new Set();
  const scene = json.scenes[json.scene ?? 0];
  const roots = scene.nodes ?? [];

  const visit = (nodeIndex, parentTranslation = [0, 0, 0]) => {
    if (visited.has(`${nodeIndex}:${parentTranslation.join(",")}`)) return;
    visited.add(`${nodeIndex}:${parentTranslation.join(",")}`);
    const node = json.nodes[nodeIndex];
    const translation = [
      parentTranslation[0] + (node.translation?.[0] ?? 0),
      parentTranslation[1] + (node.translation?.[1] ?? 0),
      parentTranslation[2] + (node.translation?.[2] ?? 0),
    ];
    if (typeof node.mesh === "number") {
      const mesh = json.meshes[node.mesh];
      const meshBounds = emptyBounds();
      for (const primitive of mesh.primitives) {
        const positions = readVec3Accessor(json, bin, primitive.attributes.POSITION);
        for (let index = 0; index < positions.length; index += 3) {
          expandBounds(meshBounds, [
            positions[index] + translation[0],
            positions[index + 1] + translation[1],
            positions[index + 2] + translation[2],
          ]);
        }
      }
      mergeBounds(all, meshBounds);
      mergeBounds(mesh.name?.includes("wheel") ? wheels : body, meshBounds);
    }
    for (const childIndex of node.children ?? []) visit(childIndex, translation);
  };

  for (const root of roots) visit(root);
  return { all, body, wheels };
}

function makeAccents(kind, metrics) {
  const b = metrics.body;
  const all = metrics.all;
  const width = boundSize(b, 0);
  const height = boundSize(b, 1);
  const length = boundSize(b, 2);
  const cx = boundCenter(b, 0);
  const cz = boundCenter(b, 2);
  const frontZ = b.max[2];
  const rearZ = b.min[2];
  const topY = b.max[1];
  const floorY = all.min[1];
  const bumperY = b.min[1] + height * (kind === "monster" ? 0.35 : 0.32);
  const hoodY = b.min[1] + height * (kind === "monster" ? 0.8 : 0.82);
  const roofY = topY + height * 0.035;
  const bumperDepth = Math.max(0.09, length * 0.045);
  const bumperHeight = Math.max(0.09, height * 0.11);
  const armorHeight = Math.max(0.035, height * 0.04);
  const frontPlateZ = cz + length * 0.25;
  const roofPlateZ = cz - length * 0.12;

  const accents = [
    box("front crash bar", [cx, bumperY, frontZ + bumperDepth * 0.72], [width * 1.03, bumperHeight, bumperDepth], "armor"),
    box("rear crash bar", [cx, bumperY, rearZ - bumperDepth * 0.72], [width * 0.96, bumperHeight * 0.9, bumperDepth], "armor"),
    box("hood armor plate", [cx, hoodY, frontPlateZ], [width * 0.5, armorHeight, length * 0.22], "armor"),
    box("roof armor plate", [cx, roofY, roofPlateZ], [width * 0.56, armorHeight, length * 0.22], "armor"),
    box(`${kind === "monster" ? "red" : "cyan"} belly glow`, [cx, floorY + 0.025, cz], [width * 0.72, 0.03, length * 0.76], "glow"),
  ];

  if (kind === "monster") {
    accents.push(
      box("roof light rail", [cx, roofY + height * 0.045, cz + length * 0.16], [width * 0.7, armorHeight * 1.35, length * 0.045], "armor"),
    );
    for (let index = 0; index < 4; index += 1) {
      const x = cx + width * (-0.24 + index * 0.16);
      accents.push(
        box(`roof lamp ${index + 1}`, [x, roofY + height * 0.105, cz + length * 0.18], [width * 0.08, height * 0.085, length * 0.045], "glow"),
      );
    }
  } else {
    accents.push(
      box("derby hood stripe", [cx, hoodY + armorHeight * 1.35, cz + length * 0.03], [width * 0.1, armorHeight * 0.75, length * 0.62], "armor"),
    );
  }

  return accents;
}

function stylize(kind) {
  const sourcePath = `${MODEL_DIR}/${kind === "derby" ? "derby" : "monster"}.glb`;
  const outPath = `${MODEL_DIR}/${kind}-cyber.glb`;
  const { json, bin } = readGlb(sourcePath);
  const binState = { bin: Buffer.from(bin) };

  json.asset = {
    ...json.asset,
    generator: "TeamBuild Games Road Madness cyber model styler",
  };

  const materialStart = json.materials.length;
  const palette = MATERIALS[kind];
  json.materials.push(palette.body, palette.wheel, palette.armor, palette.glow);
  const materialIndex = {
    body: materialStart,
    wheel: materialStart + 1,
    armor: materialStart + 2,
    glow: materialStart + 3,
  };

  for (const mesh of json.meshes) {
    const key = mesh.name?.includes("wheel") ? "wheel" : "body";
    for (const primitive of mesh.primitives) primitive.material = materialIndex[key];
  }

  for (const accent of makeAccents(kind, computeModelBounds(json, bin))) {
    const geometry = makeBoxGeometry(accent.center, accent.size);
    const positionAccessor = addAccessor(json, binState, geometry.positions, GL.FLOAT, "VEC3", GL.ARRAY_BUFFER);
    const normalAccessor = addAccessor(json, binState, geometry.normals, GL.FLOAT, "VEC3", GL.ARRAY_BUFFER);
    const indexAccessor = addAccessor(json, binState, geometry.indices, GL.UNSIGNED_SHORT, "SCALAR", GL.ELEMENT_ARRAY_BUFFER);
    const meshIndex = json.meshes.push({
      name: accent.name,
      primitives: [{
        attributes: {
          POSITION: positionAccessor,
          NORMAL: normalAccessor,
        },
        indices: indexAccessor,
        material: materialIndex[accent.material],
        mode: GL.TRIANGLES,
      }],
    }) - 1;
    const nodeIndex = json.nodes.push({
      mesh: meshIndex,
      name: accent.name,
    }) - 1;
    json.scenes[json.scene ?? 0].nodes.push(nodeIndex);
  }

  json.buffers[0].byteLength = pad4(binState.bin.length);
  writeGlb(outPath, json, binState.bin);
  console.log(`wrote ${outPath}`);
}

stylize("derby");
stylize("monster");
