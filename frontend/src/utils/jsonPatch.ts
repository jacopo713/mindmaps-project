// Minimal JSON Patch (RFC 6902 subset) applier for our mind map state
// Supported ops: add, remove, replace. Paths target `/nodes` or `/connections` and their fields.

import type { MindMapNode, Connection } from '../types';

export type JsonPatchOp = {
  op: 'add' | 'remove' | 'replace';
  path: string; // e.g., /nodes/1/title or /connections/-
  value?: any;
};

export interface MapState {
  nodes: MindMapNode[];
  connections: Connection[];
  // allow passthrough of extra fields
  [key: string]: any;
}

function decodePointerSegment(seg: string): string {
  return seg.replace(/~1/g, '/').replace(/~0/g, '~');
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export function applyJsonPatch(state: MapState, patch: JsonPatchOp[]): MapState {
  let working = { ...state, nodes: state.nodes ? [...state.nodes] : [], connections: state.connections ? [...state.connections] : [] };

  for (const op of patch) {
    try {
      const rawSegments = op.path.split('/').slice(1);
      const segments = rawSegments.map(decodePointerSegment);
      const target = segments[0];

      if (target !== 'nodes' && target !== 'connections') {
        // Ignore unsupported roots to avoid corrupting unknown parts
        continue;
      }

      const arr = target === 'nodes' ? working.nodes : working.connections;

      if (segments.length === 1) {
        // Path points to the array itself. Only allow add with '-'
        if (op.op === 'add' && op.value && op.path.endsWith('/-')) {
          const v = clone(op.value);
          if (target === 'connections') {
            if (v.type === undefined) v.type = 'curved';
            if (v.width === undefined) v.width = 2;
            if (v.showArrow === undefined) v.showArrow = true;
            if (v.arrowPosition === undefined) v.arrowPosition = 'end';
            if (v.color === undefined) v.color = '#6b7280';
            if (v.relation === undefined) v.relation = 'generico';
          }
          if (target === 'nodes') {
            if (typeof v.x !== 'number') v.x = 0;
            if (typeof v.y !== 'number') v.y = 0;
          }
          arr.push(v);
        }
        continue;
      }

      const indexSeg = segments[1];
      const isAppend = indexSeg === '-';
      const index = isAppend ? arr.length : parseInt(indexSeg, 10);

      if (Number.isNaN(index) && !isAppend) continue;

      if (segments.length === 2) {
        // Operate on entire item at index or append a new item
        if (op.op === 'remove' && !isAppend) {
          if (index >= 0 && index < arr.length) {
            arr.splice(index, 1);
          }
        } else if (op.op === 'replace' && !isAppend) {
          if (index >= 0 && index < arr.length && op.value !== undefined) {
            arr[index] = clone(op.value);
          }
        } else if (op.op === 'add') {
          const value = op.value !== undefined ? clone(op.value) : undefined;
          if (!value) continue;
          if (isAppend) {
            // Missing x,y handling for new nodes
            if (target === 'nodes') {
              if (typeof value.x !== 'number') value.x = 0;
              if (typeof value.y !== 'number') value.y = 0;
            } else if (target === 'connections') {
              if (value.type === undefined) value.type = 'curved';
              if (value.width === undefined) value.width = 2;
              if (value.showArrow === undefined) value.showArrow = true;
              if (value.arrowPosition === undefined) value.arrowPosition = 'end';
              if (value.color === undefined) value.color = '#6b7280';
              if (value.relation === undefined) value.relation = 'generico';
            }
            arr.push(value);
          } else if (index >= 0 && index <= arr.length) {
            arr.splice(index, 0, value);
          }
        }
        continue;
      }

      // Nested property modification: /<target>/<idx>/<prop>/...
      if (isAppend) {
        // Cannot modify properties of an append-only path; skip
        continue;
      }
      if (!(index >= 0 && index < arr.length)) continue;

      // Resolve nested path on a cloned object to keep immutability
      const item = clone(arr[index] as any);
      let cursor: any = item;
      for (let i = 2; i < segments.length - 1; i++) {
        const key = segments[i];
        if (cursor[key] === undefined) {
          if (op.op === 'add') cursor[key] = {};
          else { cursor = undefined; break; }
        }
        cursor = cursor[key];
      }
      if (cursor === undefined) continue;

      const lastKey = segments[segments.length - 1];

      if (op.op === 'remove') {
        if (Array.isArray(cursor) && lastKey === '-') {
          cursor.pop();
        } else if (Array.isArray(cursor) && !Number.isNaN(parseInt(lastKey, 10))) {
          const idx = parseInt(lastKey, 10);
          if (idx >= 0 && idx < cursor.length) cursor.splice(idx, 1);
        } else {
          delete cursor[lastKey];
        }
      } else if (op.op === 'replace') {
        cursor[lastKey] = clone(op.value);
      } else if (op.op === 'add') {
        if (Array.isArray(cursor) && lastKey === '-') {
          cursor.push(clone(op.value));
        } else if (Array.isArray(cursor) && !Number.isNaN(parseInt(lastKey, 10))) {
          const idx = parseInt(lastKey, 10);
          cursor.splice(idx, 0, clone(op.value));
        } else {
          cursor[lastKey] = clone(op.value);
        }
      }

      // Write back the mutated item
      arr[index] = item;
    } catch {
      // Ignore malformed ops
      continue;
    }
  }

  return working;
}
