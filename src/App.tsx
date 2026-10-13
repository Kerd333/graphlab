import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ArrowDownUp, ArrowLeftRight, Check, ChevronDown, CircleHelp, Copy, Download,
  Dices, Expand, GitBranch, Grid2X2, Info, Layers, Link2, Minus, MousePointer2, Network,
  Plus, Share2, Sparkles, Trash2, Upload, Waypoints, X,
} from 'lucide-react';

type Vertex = { id: string; x: number; y: number; label: string; color?: string };
type Edge = { id: string; from: string; to: string; weight: number; bend: number };
type Mode = 'select' | 'vertex' | 'edge' | 'delete';
type Tab = 'overview' | 'algorithms' | 'representations';
type EulerTrail = { vertices: string[]; edges: string[] };
type Representation = 'adjacency-matrix' | 'adjacency-list' | 'incidence-matrix';

const palette = ['#94f3cb', '#a99af7', '#f6c77a', '#ff8d9f', '#76c8ff'];
function generateRandomGraph() {
  const count = 5 + Math.floor(Math.random() * 4);
  const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const vertices = Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const radius = 150 + Math.random() * 65;
    return {
      id: `v${seed}-${index}`,
      x: 500 + Math.cos(angle) * radius + (Math.random() - 0.5) * 35,
      y: 340 + Math.sin(angle) * radius * 0.78 + (Math.random() - 0.5) * 35,
      label: String.fromCharCode(65 + index),
      color: palette[Math.floor(Math.random() * palette.length)],
    };
  });
  const edges: Edge[] = [];
  vertices.forEach((from, i) => vertices.slice(i + 1).forEach((to) => {
    if (Math.random() < 0.27) edges.push({ id: `e${seed}-${edges.length}`, from: from.id, to: to.id, weight: 1 + Math.floor(Math.random() * 9), bend: 0 });
  }));
  if (Math.random() < 0.3) {
    const from = vertices[Math.floor(Math.random() * vertices.length)];
    const to = vertices[Math.floor(Math.random() * vertices.length)];
    edges.push({ id: `e${seed}-${edges.length}`, from: from.id, to: to.id, weight: 1 + Math.floor(Math.random() * 9), bend: 0 });
  }
  return { vertices, edges };
}

function getComponents(vertices: Vertex[], edges: Edge[]) {
  const unseen = new Set(vertices.map((v) => v.id));
  const adjacency = new Map(vertices.map((v) => [v.id, [] as string[]]));
  edges.forEach((e) => {
    adjacency.get(e.from)?.push(e.to);
    adjacency.get(e.to)?.push(e.from);
  });
  const result: string[][] = [];
  while (unseen.size) {
    const start = unseen.values().next().value as string;
    const stack = [start];
    const group: string[] = [];
    unseen.delete(start);
    while (stack.length) {
      const current = stack.pop()!;
      group.push(current);
      for (const next of adjacency.get(current) ?? []) if (unseen.delete(next)) stack.push(next);
    }
    result.push(group);
  }
  return result;
}

function findEuler(vertices: Vertex[], edges: Edge[], directed: boolean): EulerTrail | null {
  if (!edges.length) return vertices.length === 1 ? { vertices: [vertices[0].id], edges: [] } : null;
  const active = new Set(edges.flatMap((e) => [e.from, e.to]));
  const adjacency = new Map<string, { next: string; edge: string }[]>();
  vertices.forEach((v) => adjacency.set(v.id, []));
  edges.forEach((e) => {
    adjacency.get(e.from)?.push({ next: e.to, edge: e.id });
    if (!directed) adjacency.get(e.to)?.push({ next: e.from, edge: e.id });
  });
  const weakComponents = getComponents(vertices.filter((v) => active.has(v.id)), edges);
  if (weakComponents.length !== 1) return null;
  const inDegree = new Map(vertices.map((v) => [v.id, 0]));
  const outDegree = new Map(vertices.map((v) => [v.id, 0]));
  for (const e of edges) {
    outDegree.set(e.from, (outDegree.get(e.from) ?? 0) + 1);
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
    if (!directed) {
      outDegree.set(e.to, (outDegree.get(e.to) ?? 0) + 1);
      inDegree.set(e.from, (inDegree.get(e.from) ?? 0) + 1);
    }
  }
  const starts = vertices.filter((v) => active.has(v.id) && (directed ? (outDegree.get(v.id)! - inDegree.get(v.id)! === 1) : outDegree.get(v.id)! % 2 === 1));
  if (directed) {
    const ends = vertices.filter((v) => active.has(v.id) && inDegree.get(v.id)! - outDegree.get(v.id)! === 1);
    const bad = vertices.some((v) => active.has(v.id) && Math.abs(outDegree.get(v.id)! - inDegree.get(v.id)!) > 1);
    if (bad || !((starts.length === 0 && ends.length === 0) || (starts.length === 1 && ends.length === 1))) return null;
  } else if (starts.length !== 0 && starts.length !== 2) return null;
  const start = starts[0]?.id ?? vertices.find((v) => active.has(v.id))!.id;
  const used = new Set<string>();
  const cursor = new Map<string, number>();
  const stack: { vertex: string; incomingEdge?: string }[] = [{ vertex: start }];
  const routeVertices: string[] = [];
  const routeEdges: string[] = [];
  while (stack.length) {
    const current = stack[stack.length - 1].vertex;
    const list = adjacency.get(current)!;
    let i = cursor.get(current) ?? 0;
    while (i < list.length && used.has(list[i].edge)) i++;
    cursor.set(current, i);
    if (i >= list.length) {
      const item = stack.pop()!;
      routeVertices.push(item.vertex);
      if (item.incomingEdge) routeEdges.push(item.incomingEdge);
    }
    else {
      const step = list[i];
      cursor.set(current, i + 1);
      used.add(step.edge);
      stack.push({ vertex: step.next, incomingEdge: step.edge });
    }
  }
  return used.size === edges.length ? { vertices: routeVertices.reverse(), edges: routeEdges.reverse() } : null;
}

function minimumSpanningTree(vertices: Vertex[], edges: Edge[]) {
  const parent = new Map(vertices.map((v) => [v.id, v.id]));
  const find = (x: string): string => {
    const p = parent.get(x)!;
    if (p !== x) parent.set(x, find(p));
    return parent.get(x)!;
  };
  const chosen: Edge[] = [];
  for (const e of [...edges].sort((a, b) => a.weight - b.weight)) {
    const a = find(e.from); const b = find(e.to);
    if (a !== b) { parent.set(a, b); chosen.push(e); }
  }
  const groups = new Set(vertices.map((v) => find(v.id))).size;
  return { edges: chosen, total: chosen.reduce((sum, edge) => sum + edge.weight, 0), complete: vertices.length <= 1 || (chosen.length === vertices.length - 1 && groups === 1) };
}

function MatrixView({ rows, columns, values }: { rows: string[]; columns: string[]; values: number[][] }) {
  return <div className="matrix-scroll"><table className="representation-matrix"><thead><tr><th />{columns.map((column, index) => <th key={`${column}-${index}`}>{column}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={`${row}-${rowIndex}`}><th>{row}</th>{values[rowIndex]?.map((value, columnIndex) => <td key={`${rowIndex}-${columnIndex}`} className={value ? 'nonzero-cell' : ''}>{value}</td>)}</tr>)}</tbody></table></div>;
}

function App() {
  const [initialGraph] = useState(generateRandomGraph);
  const [vertices, setVertices] = useState(initialGraph.vertices);
  const [edges, setEdges] = useState(initialGraph.edges);
  const [directed, setDirected] = useState(false);
  const [weighted, setWeighted] = useState(true);
  const [mode, setMode] = useState<Mode>('select');
  const [selectedVertex, setSelectedVertex] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [connectStart, setConnectStart] = useState<string | null>(null);
  const [connectPreview, setConnectPreview] = useState<{ from: string; x: number; y: number; directed: boolean } | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [representation, setRepresentation] = useState<Representation>('adjacency-matrix');
  const [toast, setToast] = useState('');
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [eulerStep, setEulerStep] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ type: 'vertex' | 'edge' | 'connect' | 'pan'; id: string; offsetX: number; offsetY: number; startBend?: number; directed?: boolean; startClientX?: number; startClientY?: number; startPanX?: number; startPanY?: number; panScaleX?: number; panScaleY?: number } | null>(null);
  const components = useMemo(() => getComponents(vertices, edges), [vertices, edges]);
  const euler = useMemo(() => findEuler(vertices, edges, directed), [vertices, edges, directed]);
  const mst = useMemo(() => minimumSpanningTree(vertices, edges), [vertices, edges]);
  const selected = vertices.find((v) => v.id === selectedVertex);
  const selectedEdgeData = edges.find((e) => e.id === selectedEdge);
  const degrees = useMemo(() => {
    const map = new Map(vertices.map((v) => [v.id, directed ? { in: 0, out: 0, total: 0 } : { in: 0, out: 0, total: 0 }]));
    edges.forEach((e) => {
      if (directed) {
        const a = map.get(e.from)!; a.out += 1; a.total += 1;
        const b = map.get(e.to)!; b.in += 1; b.total += 1;
      } else {
        map.get(e.from)!.total += e.from === e.to ? 2 : 1;
        if (e.from !== e.to) map.get(e.to)!.total += 1;
      }
    });
    return map;
  }, [vertices, edges, directed]);
  const graphProperties = useMemo(() => {
    const averageDegree = vertices.length ? [...degrees.values()].reduce((sum, degree) => sum + degree.total, 0) / vertices.length : 0;
    const pairs = new Set<string>();
    const directedArcs = new Set<string>();
    let hasLoop = false;
    for (const edge of edges) {
      if (edge.from === edge.to) hasLoop = true;
      else pairs.add([edge.from, edge.to].sort().join(':'));
      directedArcs.add(`${edge.from}>${edge.to}`);
    }
    const vertexCount = vertices.length;
    const complete = directed
      ? !hasLoop && edges.length === vertexCount * (vertexCount - 1) && directedArcs.size === vertexCount * (vertexCount - 1)
      : !hasLoop && edges.length === vertexCount * (vertexCount - 1) / 2 && pairs.size === vertexCount * (vertexCount - 1) / 2;
    const colors = new Map<string, number>();
    const adjacency = new Map(vertices.map((vertex) => [vertex.id, [] as string[]]));
    for (const edge of edges) {
      adjacency.get(edge.from)?.push(edge.to);
      adjacency.get(edge.to)?.push(edge.from);
    }
    let bipartite = true;
    for (const vertex of vertices) {
      if (colors.has(vertex.id)) continue;
      colors.set(vertex.id, 0);
      const queue = [vertex.id];
      while (queue.length && bipartite) {
        const current = queue.shift()!;
        for (const neighbor of adjacency.get(current) ?? []) {
          if (!colors.has(neighbor)) { colors.set(neighbor, 1 - colors.get(current)!); queue.push(neighbor); }
          else if (colors.get(neighbor) === colors.get(current)) { bipartite = false; break; }
        }
      }
      if (!bipartite) break;
    }
    const degreeValues = [...degrees.values()].map((degree) => degree.total);
    return {
      averageDegree,
      complete,
      bipartite,
      regular: degreeValues.length === 0 || degreeValues.every((degree) => degree === degreeValues[0]),
      regularDegree: degreeValues.length ? degreeValues[0] : 0,
      density: vertexCount > 1
        ? directed ? directedArcs.size / (vertexCount * (vertexCount - 1)) : pairs.size / (vertexCount * (vertexCount - 1) / 2)
        : 0,
    };
  }, [vertices, edges, degrees, directed]);
  const adjacencyMatrix = useMemo(() => vertices.map((from) => vertices.map((to) => edges.reduce((count, edge) => {
    if (directed) return count + Number(edge.from === from.id && edge.to === to.id);
    if (edge.from === edge.to) return count + (edge.from === from.id && from.id === to.id ? 2 : 0);
    return count + Number(edge.from === from.id && edge.to === to.id || edge.from === to.id && edge.to === from.id);
  }, 0))), [vertices, edges, directed]);
  const adjacencyList = useMemo(() => vertices.map((vertex) => ({
    vertex,
    neighbors: edges.flatMap((edge) => {
      if (!directed && edge.from === vertex.id && edge.to === vertex.id) return [vertex.label, vertex.label];
      if (edge.from === vertex.id) return [vertices.find((item) => item.id === edge.to)?.label ?? '?'];
      if (!directed && edge.to === vertex.id) return [vertices.find((item) => item.id === edge.from)?.label ?? '?'];
      return [];
    }),
  })), [vertices, edges, directed]);
  const incidenceMatrix = useMemo(() => vertices.map((vertex) => edges.map((edge) => {
    if (directed) return edge.from === vertex.id ? (edge.to === vertex.id ? 0 : -1) : edge.to === vertex.id ? 1 : 0;
    if (edge.from === vertex.id && edge.to === vertex.id) return 2;
    return edge.from === vertex.id || edge.to === vertex.id ? 1 : 0;
  })), [vertices, edges, directed]);
  useEffect(() => { setEulerStep(null); }, [vertices, edges, directed]);
  useEffect(() => {
    if (eulerStep === null || !euler) return;
    if (eulerStep >= euler.edges.length) {
      const finished = window.setTimeout(() => setEulerStep(null), 1000);
      return () => window.clearTimeout(finished);
    }
    const timer = window.setTimeout(() => setEulerStep((step) => step === null ? null : step + 1), 700);
    return () => window.clearTimeout(timer);
  }, [eulerStep, euler]);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2300); };
  const pointFromEvent = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current!;
    const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
    const transformed = point.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: transformed.x, y: transformed.y };
  };
  const changeZoom = (nextZoom: number) => {
    const clampedZoom = Math.max(50, Math.min(180, nextZoom));
    const oldWidth = 1000 * 100 / zoom; const oldHeight = 680 * 100 / zoom;
    const newWidth = 1000 * 100 / clampedZoom; const newHeight = 680 * 100 / clampedZoom;
    setPan((current) => ({ x: current.x + (oldWidth - newWidth) / 2, y: current.y + (oldHeight - newHeight) / 2 }));
    setZoom(clampedZoom);
  };
  const handleCanvasWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const svg = svgRef.current;
    const inverse = svg?.getScreenCTM()?.inverse();
    const pointer = svg?.createSVGPoint();
    if (pointer && inverse) {
      pointer.x = event.clientX; pointer.y = event.clientY;
      const world = pointer.matrixTransform(inverse);
      const oldWidth = 1000 * 100 / zoom; const oldHeight = 680 * 100 / zoom;
      const fractionX = (world.x - pan.x) / oldWidth; const fractionY = (world.y - pan.y) / oldHeight;
      const nextZoom = Math.max(50, Math.min(180, zoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1)));
      const newWidth = 1000 * 100 / nextZoom; const newHeight = 680 * 100 / nextZoom;
      setPan({ x: world.x - fractionX * newWidth, y: world.y - fractionY * newHeight });
      setZoom(nextZoom);
    }
  };
  const addVertex = (x: number, y: number) => {
    const id = `v${Date.now()}`;
    const usedLabels = new Set(vertices.map((vertex) => vertex.label));
    let index = 0;
    let label = 'A';
    while (usedLabels.has(label)) {
      index += 1;
      label = index < 26 ? String.fromCharCode(65 + index) : `${String.fromCharCode(65 + Math.floor(index / 26) - 1)}${String.fromCharCode(65 + index % 26)}`;
    }
    setVertices((items) => [...items, { id, x, y, label, color: palette[vertices.length % palette.length] }]);
    setSelectedVertex(id); setSelectedEdge(null); setMode('select');
  };
  const addEdge = (from: string, to: string) => {
    const id = `e${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setEdges((items) => {
      const next = [...items, { id, from, to, weight: 1, bend: 0 }];
      const pairKey = [from, to].sort().join(':');
      const parallel = next.filter((edge) => [edge.from, edge.to].sort().join(':') === pairKey);
      if (parallel.length < 2) return next;
      const bends = new Map(parallel.map((edge, index) => {
        if (edge.from === edge.to) return [edge.id, 28 + index * 34] as const;
        const canonicalBend = (index - (parallel.length - 1) / 2) * 38;
        return [edge.id, edge.from < edge.to ? canonicalBend : -canonicalBend] as const;
      }));
      return next.map((edge) => bends.has(edge.id) ? { ...edge, bend: bends.get(edge.id)! } : edge);
    });
    return id;
  };
  const handleCanvasPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button === 1 || (event.button === 0 && event.target === svgRef.current && mode === 'select')) {
      event.preventDefault();
      const svg = svgRef.current!;
      const inverse = svg.getScreenCTM()?.inverse();
      const userPoint = svg.createSVGPoint(); userPoint.x = event.clientX; userPoint.y = event.clientY;
      const userX = svg.createSVGPoint(); userX.x = event.clientX + 1; userX.y = event.clientY;
      const userY = svg.createSVGPoint(); userY.x = event.clientX; userY.y = event.clientY + 1;
      const origin = userPoint.matrixTransform(inverse); const xUnit = userX.matrixTransform(inverse); const yUnit = userY.matrixTransform(inverse);
      dragRef.current = { type: 'pan', id: 'canvas', offsetX: 0, offsetY: 0, startClientX: event.clientX, startClientY: event.clientY, startPanX: pan.x, startPanY: pan.y, panScaleX: xUnit.x - origin.x, panScaleY: yUnit.y - origin.y };
      svg.setPointerCapture(event.pointerId); setSelectedVertex(null); setSelectedEdge(null); setIsPanning(true);
      return;
    }
    if (event.target === svgRef.current && mode === 'vertex') {
      const p = pointFromEvent(event); addVertex(p.x, p.y);
    } else if (event.target === svgRef.current) { setSelectedVertex(null); setSelectedEdge(null); }
  };
  const onVertexPointerDown = (event: React.PointerEvent<SVGGElement>, vertex: Vertex) => {
    event.stopPropagation();
    if (mode === 'delete') { setVertices((items) => items.filter((v) => v.id !== vertex.id)); setEdges((items) => items.filter((e) => e.from !== vertex.id && e.to !== vertex.id)); return; }
    if (mode === 'select' && (event.ctrlKey || event.shiftKey)) {
      dragRef.current = { type: 'connect', id: vertex.id, offsetX: 0, offsetY: 0, directed: event.shiftKey };
      setConnectPreview({ from: vertex.id, x: vertex.x, y: vertex.y, directed: event.shiftKey });
      setSelectedVertex(vertex.id); setSelectedEdge(null);
      svgRef.current?.setPointerCapture(event.pointerId);
      return;
    }
    if (mode === 'edge') {
      if (!connectStart) { setConnectStart(vertex.id); setSelectedVertex(vertex.id); }
      else {
        const id = addEdge(connectStart, vertex.id);
        setConnectStart(null); setMode('select'); setSelectedEdge(id); setSelectedVertex(null);
      }
      return;
    }
    setSelectedVertex(vertex.id); setSelectedEdge(null);
    const p = pointFromEvent(event as unknown as React.PointerEvent<SVGSVGElement>);
    dragRef.current = { type: 'vertex', id: vertex.id, offsetX: vertex.x - p.x, offsetY: vertex.y - p.y };
    svgRef.current?.setPointerCapture(event.pointerId);
  };
  const onEdgePointerDown = (event: React.PointerEvent<SVGPathElement>, edge: Edge) => {
    event.stopPropagation();
    if (mode === 'delete') { setEdges((items) => items.filter((e) => e.id !== edge.id)); return; }
    setSelectedEdge(edge.id); setSelectedVertex(null);
    const p = pointFromEvent(event as unknown as React.PointerEvent<SVGSVGElement>);
    dragRef.current = { type: 'edge', id: edge.id, offsetX: p.x, offsetY: p.y, startBend: edge.bend };
    svgRef.current?.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current) return;
    const p = pointFromEvent(event);
    if (dragRef.current.type === 'connect') {
      setConnectPreview({ from: dragRef.current.id, x: p.x, y: p.y, directed: Boolean(dragRef.current.directed) });
      return;
    }
    if (dragRef.current.type === 'pan') {
      const drag = dragRef.current;
      setPan({
        x: (drag.startPanX ?? pan.x) - (event.clientX - (drag.startClientX ?? event.clientX)) * (drag.panScaleX ?? 1),
        y: (drag.startPanY ?? pan.y) - (event.clientY - (drag.startClientY ?? event.clientY)) * (drag.panScaleY ?? 1),
      });
      return;
    }
    if (dragRef.current.type === 'vertex') {
      const { id, offsetX, offsetY } = dragRef.current;
      setVertices((items) => items.map((v) => v.id === id ? { ...v, x: Math.max(36, Math.min(964, p.x + offsetX)), y: Math.max(36, Math.min(644, p.y + offsetY)) } : v));
    } else {
      const edge = edges.find((item) => item.id === dragRef.current?.id);
      if (!edge) return;
      const from = vertices.find((v) => v.id === edge.from); const to = vertices.find((v) => v.id === edge.to);
      if (!from || !to) return;
      if (edge.from === edge.to) {
        const bend = Math.max(-30, Math.min(220, (dragRef.current?.startBend ?? edge.bend) + (dragRef.current?.offsetY ?? p.y) - p.y));
        setEdges((items) => items.map((item) => item.id === edge.id ? { ...item, bend } : item));
        return;
      }
      const dx = to.x - from.x; const dy = to.y - from.y; const len = Math.hypot(dx, dy) || 1;
      const midX = (from.x + to.x) / 2; const midY = (from.y + to.y) / 2;
      const bend = ((p.x - midX) * -dy + (p.y - midY) * dx) / len;
      setEdges((items) => items.map((e) => e.id === edge.id ? { ...e, bend } : e));
    }
  };
  const endDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (drag?.type === 'connect') {
      const point = pointFromEvent(event);
      const target = vertices.find((vertex) => Math.hypot(vertex.x - point.x, vertex.y - point.y) < 34);
      if (target) {
        const id = addEdge(drag.id, target.id);
        if (drag.directed) setDirected(true);
        setSelectedVertex(null); setSelectedEdge(id);
      }
    }
    setConnectPreview(null);
    setIsPanning(false);
    dragRef.current = null;
  };
  const handleEdgeClick = (event: React.MouseEvent<SVGPathElement>, edge: Edge) => {
    event.stopPropagation();
    if (mode === 'delete') setEdges((items) => items.filter((e) => e.id !== edge.id));
    else if (mode !== 'edge') { setSelectedEdge(edge.id); setSelectedVertex(null); }
  };
  const edgeGeometry = (edge: Edge) => {
    const from = vertices.find((v) => v.id === edge.from); const to = vertices.find((v) => v.id === edge.to);
    if (!from || !to) return null;
    if (edge.from === edge.to) {
      const height = 76 + edge.bend;
      return { d: `M ${from.x - 10} ${from.y - 24} C ${from.x - 65} ${from.y - height}, ${from.x + 65} ${from.y - height}, ${from.x + 10} ${from.y - 24}`, labelX: from.x, labelY: from.y - height + 4, arrowX: from.x + 10, arrowY: from.y - 26 };
    }
    const dx = to.x - from.x; const dy = to.y - from.y; const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length; const ny = dx / length;
    const sx = from.x + dx / length * 25; const sy = from.y + dy / length * 25;
    const ex = to.x - dx / length * 27; const ey = to.y - dy / length * 27;
    const cx = (from.x + to.x) / 2 + nx * edge.bend; const cy = (from.y + to.y) / 2 + ny * edge.bend;
    const t = 0.88; const arrowX = (1-t)*(1-t)*sx + 2*(1-t)*t*cx + t*t*ex; const arrowY = (1-t)*(1-t)*sy + 2*(1-t)*t*cy + t*t*ey;
    return { d: `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`, labelX: .25*sx + .5*cx + .25*ex, labelY: .25*sy + .5*cy + .25*ey, arrowX, arrowY };
  };
  const createEdgeBetween = (from: string, to: string) => addEdge(from, to);
  const removeSelected = () => {
    if (selectedVertex) { setVertices((items) => items.filter((v) => v.id !== selectedVertex)); setEdges((items) => items.filter((e) => e.from !== selectedVertex && e.to !== selectedVertex)); setSelectedVertex(null); }
    else if (selectedEdge) { setEdges((items) => items.filter((e) => e.id !== selectedEdge)); setSelectedEdge(null); }
  };
  const updateWeight = (id: string, weight: number) => setEdges((items) => items.map((e) => e.id === id ? { ...e, weight } : e));
  const exportGraph = () => {
    const blob = new Blob([JSON.stringify({ directed, weighted, vertices, edges }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'graphlab-graph.json'; anchor.click(); URL.revokeObjectURL(url);
  };
  const importGraph = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const graph = JSON.parse(await file.text());
      if (!Array.isArray(graph.vertices) || !Array.isArray(graph.edges)) throw new Error('Invalid graph');
      setVertices(graph.vertices); setEdges(graph.edges); setDirected(Boolean(graph.directed)); setWeighted(graph.weighted !== false); setSelectedVertex(null); setSelectedEdge(null); notify('Graph imported');
    } catch { notify('Could not read that graph file'); }
    event.target.value = '';
  };
  const randomizeGraph = () => {
    const graph = generateRandomGraph();
    setVertices(graph.vertices); setEdges(graph.edges); setDirected(false); setWeighted(true); setSelectedVertex(null); setSelectedEdge(null); setConnectStart(null); setMode('select');
    notify('Random graph generated');
  };
  const deleteGraph = () => {
    setVertices([]); setEdges([]); setSelectedVertex(null); setSelectedEdge(null); setConnectStart(null); setMode('select');
    notify('Graph cleared');
  };
  const showEuler = () => {
    setTab('algorithms');
    if (!euler) { setEulerStep(null); notify('No Euler trail exists for this graph'); return; }
    setEulerStep(0);
    notify(`Animating Euler trail: ${euler.vertices.map((id) => vertices.find((vertex) => vertex.id === id)?.label ?? id).join(' → ')}`);
  };
  const runMst = () => { setTab('algorithms'); if (mst.complete) { const ids = new Set(mst.edges.map((e) => e.id)); setSelectedEdge(null); notify(`Minimum spanning tree · total weight ${mst.total}`); setEdges((items) => items.map((e) => ids.has(e.id) ? { ...e, bend: e.bend } : e)); } else notify('A spanning tree needs a connected graph'); };
  const eulerTraveler = eulerStep !== null && euler ? vertices.find((vertex) => vertex.id === euler.vertices[Math.min(eulerStep, euler.vertices.length - 1)]) : null;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><Waypoints size={19} strokeWidth={2.2} /></div><div className="brand-name">graph<span>lab</span><small>WORKBENCH</small></div></div>
        <div className="top-divider" />
        <div className="document-name"><span className="live-dot" />Untitled graph <ChevronDown size={14} /></div>
        <div className="header-spacer" />
        <div className="graph-tags"><span className="tag"><span className="tag-dot" />{directed ? 'Directed' : 'Undirected'}</span><span className="tag">{vertices.length} vertices</span><span className="tag">{edges.length} edges</span></div>
        <button className="header-action random-action" title="Generate a random graph" onClick={randomizeGraph}><Dices size={14} />Random</button>
        <button className="header-action clear-action" title="Delete the entire graph" onClick={deleteGraph}><Trash2 size={14} />Clear graph</button>
        <button className="icon-button header-icon" title="Import graph" onClick={() => fileInput.current?.click()}><Upload size={16} /></button>
        <button className="share-button" onClick={exportGraph}><Share2 size={15} /> Export</button>
        <input ref={fileInput} className="hidden-input" type="file" accept="application/json" onChange={importGraph} />
      </header>
      <section className="workspace">
        <aside className="left-rail">
          <div className="rail-group">
            <button className={`tool-button ${mode === 'select' ? 'active' : ''}`} title="Select and move (V)" onClick={() => { setMode('select'); setConnectStart(null); }}><MousePointer2 size={18} /><span>Select</span></button>
            <button className={`tool-button ${mode === 'vertex' ? 'active' : ''}`} title="Add vertex (click canvas)" onClick={() => { setMode('vertex'); setConnectStart(null); }}><Plus size={19} /><span>Vertex</span></button>
            <button className={`tool-button ${mode === 'edge' ? 'active' : ''}`} title="Connect vertices" onClick={() => { setMode('edge'); setConnectStart(null); }}><Link2 size={17} /><span>Edge</span></button>
            <button className={`tool-button ${mode === 'delete' ? 'active danger-active' : ''}`} title="Delete vertices or edges" onClick={() => { setMode('delete'); setConnectStart(null); }}><Trash2 size={17} /><span>Delete</span></button>
          </div>
          <div className="rail-divider" />
          <div className="rail-group rail-quick">
            <button className="tool-button compact" title="Toggle directed graph" onClick={() => setDirected((v) => !v)}>{directed ? <ArrowDownUp size={17} /> : <ArrowLeftRight size={17} />}<span>{directed ? 'Directed' : 'Undirected'}</span></button>
            <button className={`tool-button compact ${weighted ? 'active-soft' : ''}`} title="Toggle edge weights" onClick={() => setWeighted((v) => !v)}><Activity size={17} /><span>Weights</span></button>
          </div>
          <div className="rail-bottom"><button className="help-button" title="GraphLab help" onClick={() => notify('Ctrl-drag creates an edge · Shift-drag creates a directed edge')}><CircleHelp size={17} /></button></div>
        </aside>
        <section className="canvas-column">
          <div className="canvas-toolbar">
            <div className="canvas-breadcrumb"><span>CANVAS</span><span className="breadcrumb-dot">/</span><strong>{directed ? 'Directed graph' : 'Undirected multigraph'}</strong></div>
            <div className="canvas-actions">
              <span className="keyboard-hint">{mode === 'vertex' ? 'CLICK CANVAS TO ADD' : mode === 'edge' ? (connectStart ? 'NOW SELECT ANOTHER VERTEX' : 'SELECT TWO VERTICES') : mode === 'delete' ? 'CLICK TO DELETE' : 'DRAG CANVAS TO PAN · WHEEL TO ZOOM'}</span>
              <div className="small-divider" />
              <button className="zoom-button" onClick={() => changeZoom(zoom - 10)} aria-label="Zoom out"><Minus size={14} /></button><span className="zoom-level">{Math.floor(zoom)}%</span><button className="zoom-button" onClick={() => changeZoom(zoom + 10)} aria-label="Zoom in"><Plus size={14} /></button><button className="zoom-button fit-button" onClick={() => { setZoom(100); setPan({ x: 0, y: 0 }); }} title="Reset zoom and position"><Expand size={14} /></button>
            </div>
          </div>
          <div className="canvas-wrap">
            <svg ref={svgRef} className={`graph-canvas mode-${mode} ${isPanning ? 'is-panning' : ''}`} viewBox={`${pan.x} ${pan.y} ${1000 * 100 / zoom} ${680 * 100 / zoom}`} preserveAspectRatio="xMidYMid meet" onPointerDown={handleCanvasPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} onWheel={handleCanvasWheel}>
              <defs><pattern id="dot-grid" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#293039" /></pattern><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L8,4 L0,8 z" fill="#8b96a4" /></marker><marker id="arrow-active" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L8,4 L0,8 z" fill="#94f3cb" /></marker><marker id="arrow-mst" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L8,4 L0,8 z" fill="#63a9ff" /></marker><marker id="arrow-euler" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L8,4 L0,8 z" fill="#94f3cb" /></marker></defs>
              <rect className="canvas-bg" width="1000" height="680" fill="url(#dot-grid)" style={{ pointerEvents: 'none' }} />
              {connectPreview && (() => {
                const origin = vertices.find((vertex) => vertex.id === connectPreview.from);
                if (!origin) return null;
                return <g className="connect-preview" pointerEvents="none"><path d={`M ${origin.x} ${origin.y} L ${connectPreview.x} ${connectPreview.y}`} markerEnd={connectPreview.directed ? 'url(#arrow-active)' : undefined} /><circle cx={origin.x} cy={origin.y} r="29" /><circle cx={connectPreview.x} cy={connectPreview.y} r="4" /></g>;
              })()}
              <g className="edges-layer">
                {edges.map((edge) => {
                  const geometry = edgeGeometry(edge); if (!geometry) return null;
                  const active = selectedEdge === edge.id;
                  const inMst = tab === 'algorithms' && mst.edges.some((item) => item.id === edge.id);
                  const trailEdgeIndex = euler?.edges.indexOf(edge.id) ?? -1;
                  const traversed = eulerStep !== null && trailEdgeIndex >= 0 && trailEdgeIndex < eulerStep;
                  const currentTrailEdge = eulerStep !== null && trailEdgeIndex === eulerStep;
                  return <g key={edge.id} className={`edge-group ${active ? 'selected' : ''} ${inMst ? 'mst-edge' : ''} ${traversed ? 'euler-traversed' : ''} ${currentTrailEdge ? 'euler-current' : ''}`}>
                    <path d={geometry.d} className="edge-hit" onPointerDown={(event) => onEdgePointerDown(event, edge)} onClick={(event) => handleEdgeClick(event, edge)} />
                    <path d={geometry.d} className={`edge-line ${active ? 'edge-line-active' : ''}`} markerEnd={directed ? (traversed || currentTrailEdge ? 'url(#arrow-euler)' : inMst ? 'url(#arrow-mst)' : active ? 'url(#arrow-active)' : 'url(#arrow)') : undefined} />
                    <circle cx={geometry.labelX} cy={geometry.labelY} r="13" className={`weight-pill ${weighted ? '' : 'hidden-weight'}`} />
                    {weighted && <text x={geometry.labelX} y={geometry.labelY + 3.5} className="edge-weight" onPointerDown={(event) => onEdgePointerDown(event as unknown as React.PointerEvent<SVGPathElement>, edge)}>{edge.weight}</text>}
                  </g>;
                })}
              </g>
              <g className="vertices-layer">
                {vertices.map((vertex) => {
                  const d = degrees.get(vertex.id)!; const isSelected = selectedVertex === vertex.id; const isConnecting = connectStart === vertex.id;
                  const trailVisited = eulerStep !== null && euler && euler.vertices.slice(0, eulerStep + 1).includes(vertex.id);
                  return <g key={vertex.id} className={`vertex-group ${isSelected ? 'vertex-selected' : ''} ${isConnecting ? 'vertex-connecting' : ''} ${trailVisited ? 'euler-visited' : ''}`} transform={`translate(${vertex.x} ${vertex.y})`} onPointerDown={(event) => onVertexPointerDown(event, vertex)}>
                    {(isSelected || isConnecting) && <circle r="31" className="selection-ring" />}
                    <circle r="24" className="vertex-shadow" />
                    <circle r="22" className="vertex-circle" style={{ '--vertex-color': vertex.color ?? palette[0] } as React.CSSProperties} />
                    <text y="5" className="vertex-label">{vertex.label}</text>
                    <text y="43" className="degree-label">{directed ? `${d.in} / ${d.out}` : `deg ${d.total}`}</text>
                  </g>;
                })}
              </g>
              {eulerTraveler && <g className="euler-traveler" transform={`translate(${eulerTraveler.x} ${eulerTraveler.y})`} pointerEvents="none"><circle r="30" /><circle r="6" /></g>}
              {vertices.length === 0 && <g className="empty-canvas" pointerEvents="none"><text x="500" y="315" textAnchor="middle">Your canvas is ready</text><text x="500" y="344" textAnchor="middle">Choose Vertex and click anywhere to begin</text></g>}
            </svg>
            <div className="canvas-legend"><span><i className="legend-node" />Vertex</span><span><i className="legend-edge" />{directed ? 'Arc' : 'Edge'}</span><span><i className="legend-weight">2</i>Weight</span></div>
            <div className="canvas-status"><span className="status-dot" />{mode === 'edge' ? connectStart ? 'Choose destination vertex' : 'Ready to connect' : mode === 'vertex' ? 'Click canvas to place vertex' : mode === 'delete' ? 'Delete mode' : 'Ready to edit graph'}</div>
          </div>
          <div className="bottom-strip"><span><Grid2X2 size={14} /> {components.length} {components.length === 1 ? 'component' : 'components'}</span><span className="strip-separator" /><span><Layers size={14} /> Multigraph enabled</span><span className="strip-spacer" /><span className="coordinates">GRAPH THEORY / INTERACTIVE MODE</span></div>
        </section>
        <aside className="inspector">
          <div className="inspector-tabs"><button className={tab === 'overview' ? 'tab-active' : ''} onClick={() => setTab('overview')}>Overview</button><button className={tab === 'algorithms' ? 'tab-active' : ''} onClick={() => setTab('algorithms')}>Algorithms <span className="new-dot" /></button><button className={tab === 'representations' ? 'tab-active' : ''} onClick={() => setTab('representations')}>Matrices</button></div>
          {tab === 'overview' ? <div className="inspector-scroll">
            <section className="panel-section graph-summary"><div className="section-eyebrow">GRAPH SUMMARY <span className="summary-spark"><Sparkles size={13} /></span></div><h2>{directed ? 'Directed' : 'Undirected'}<br /><span>{edges.length > 0 && edges.length >= vertices.length ? 'multigraph' : 'graph'}</span></h2><div className="summary-meta"><span><b>{vertices.length}</b> vertices</span><span><b>{edges.length}</b> edges</span></div></section>
                <section className="panel-section"><div className="section-title">Structure <button className="plain-icon" title="Structural properties"><Info size={14} /></button></div><div className="property-list"><div className="property-row"><span>{directed ? 'Weakly connected' : 'Connected'}</span><span className={`property-value ${components.length === 1 ? 'good' : 'warn'}`}><i />{components.length === 1 ? 'Yes' : 'No'}</span></div><div className="property-row"><span>Components</span><span className="property-value">{components.length}</span></div><div className="property-row"><span>Average degree</span><span className="property-value">{graphProperties.averageDegree.toFixed(2)}</span></div><div className="property-row"><span>Complete</span><span className={`property-value ${graphProperties.complete ? 'good' : ''}`}>{graphProperties.complete ? 'Yes' : 'No'}</span></div><div className="property-row"><span>Bipartite</span><span className={`property-value ${graphProperties.bipartite ? 'good' : 'warn'}`}>{graphProperties.bipartite ? 'Yes' : 'No'}</span></div><div className="property-row"><span>Regular</span><span className={`property-value ${graphProperties.regular ? 'good' : ''}`}>{graphProperties.regular ? `Yes · degree ${graphProperties.regularDegree}` : 'No'}</span></div><div className="property-row"><span>Self-loops</span><span className="property-value">{edges.filter((e) => e.from === e.to).length}</span></div><div className="property-row"><span>Parallel edges</span><span className="property-value">{edges.length - new Set(edges.map((e) => [e.from, e.to].sort().join(':'))).size}</span></div><div className="property-row"><span>Density</span><span className="property-value">{(graphProperties.density * 100).toFixed(0)}%</span></div></div></section>
            <section className="panel-section"><div className="section-title">Vertex degrees <button className="text-link" onClick={() => setSelectedVertex(vertices[0]?.id ?? null)}>View all</button></div><div className="degree-table"><div className="degree-head"><span>VERTEX</span><span>{directed ? 'IN' : 'DEGREE'}</span>{directed && <span>OUT</span>}</div>{vertices.slice(0, 6).map((v) => { const d = degrees.get(v.id)!; return <button className={`degree-row ${selectedVertex === v.id ? 'degree-current' : ''}`} key={v.id} onClick={() => { setSelectedVertex(v.id); setSelectedEdge(null); }}><span className="degree-vertex"><i style={{ background: v.color }} />{v.label}</span><span>{directed ? d.in : d.total}</span>{directed && <span>{d.out}</span>}</button>; })}</div></section>
            <section className="panel-section quick-algorithms"><div className="section-title">Quick analysis <span className="beta-pill">LIVE</span></div><button className="algorithm-row" onClick={showEuler}><span className="algorithm-icon euler-icon"><GitBranch size={16} /></span><span><b>Euler path</b><small>{euler ? 'Available in this graph' : 'No Euler path found'}</small></span><span className={`mini-check ${euler ? 'check-good' : ''}`}>{euler ? <Check size={13} /> : <X size={13} />}</span></button><button className="algorithm-row" onClick={runMst}><span className="algorithm-icon tree-icon"><Network size={16} /></span><span><b>Spanning tree</b><small>{mst.complete ? `Minimum weight · ${mst.total}` : 'Graph is disconnected'}</small></span><span className="row-arrow">↗</span></button></section>
          </div> : tab === 'algorithms' ? <div className="inspector-scroll algorithms-view">
            <section className="panel-section algorithm-intro"><div className="section-eyebrow">GRAPH ALGORITHMS</div><h2>Explore your<br /><span>graph structure.</span></h2><p>Run classic graph theory checks against the current canvas.</p></section>
            <section className="panel-section algo-card"><div className="algo-card-top"><span className="algorithm-icon euler-icon"><GitBranch size={17} /></span><span className={`algo-status ${euler ? 'status-available' : 'status-unavailable'}`}>{euler ? 'FOUND' : 'NOT FOUND'}</span></div><h3>Euler trail</h3><p>A walk that traverses every edge exactly once.</p>{euler ? <div className="result-route">{euler.vertices.map((id, i) => <span key={`${id}-${i}`}>{i > 0 && <b>→</b>}{vertices.find((vertex) => vertex.id === id)?.label ?? id}</span>)}</div> : <div className="empty-result">No Euler trail exists. Check connectivity and vertex degrees.</div>}<button className="run-button" onClick={showEuler}>{eulerStep === null ? 'Animate Euler trail' : 'Replay Euler trail'} <ArrowDownUp size={14} /></button></section>
            <section className="panel-section algo-card"><div className="algo-card-top"><span className="algorithm-icon tree-icon"><Network size={17} /></span><span className={`algo-status ${mst.complete ? 'status-available' : 'status-unavailable'}`}>{mst.complete ? 'CONNECTED' : 'DISCONNECTED'}</span></div><h3>Minimum spanning tree</h3><p>Kruskal’s algorithm · undirected interpretation.</p>{mst.complete ? <div className="mst-result"><span>{mst.edges.length} edges</span><strong>Total weight <b>{mst.total}</b></strong></div> : <div className="empty-result">A spanning tree exists only when the graph is connected.</div>}<button className="run-button" onClick={runMst}>Find spanning tree <ArrowDownUp size={14} /></button></section>
            <section className="panel-section algo-card compact-card"><div className="section-title">Connected components</div><p>{components.length === 1 ? 'Every vertex is reachable from every other vertex.' : `This graph has ${components.length} disconnected components.`}</p><div className="component-chips">{components.map((group, index) => <span key={index}>C{index + 1} · {group.map((id) => vertices.find((v) => v.id === id)?.label).join(', ')}</span>)}</div></section>
          </div> : <div className="inspector-scroll representations-view">
            <section className="panel-section algorithm-intro"><div className="section-eyebrow">GRAPH REPRESENTATIONS</div><h2>See it in<br /><span>another form.</span></h2><p>Multiedges appear as counts in adjacency matrices and repeated neighbors in lists.</p></section>
            <div className="representation-switcher"><button className={representation === 'adjacency-matrix' ? 'representation-active' : ''} onClick={() => setRepresentation('adjacency-matrix')}>Adjacency matrix</button><button className={representation === 'adjacency-list' ? 'representation-active' : ''} onClick={() => setRepresentation('adjacency-list')}>Adjacency list</button><button className={representation === 'incidence-matrix' ? 'representation-active' : ''} onClick={() => setRepresentation('incidence-matrix')}>Incidence matrix</button></div>
            {representation === 'adjacency-matrix' && <section className="representation-card"><div className="representation-heading"><h3>Adjacency matrix</h3><span>{directed ? 'rows → columns' : 'symmetric'}</span></div><p>Cells count parallel edges; undirected self-loops count twice on the diagonal.</p><MatrixView rows={vertices.map((vertex) => vertex.label)} columns={vertices.map((vertex) => vertex.label)} values={adjacencyMatrix} /></section>}
            {representation === 'adjacency-list' && <section className="representation-card"><div className="representation-heading"><h3>Adjacency list</h3><span>{directed ? 'out-neighbors' : 'neighbors'}</span></div><p>Repeated labels indicate parallel edges; undirected loops appear twice. Isolates have empty lists.</p><div className="adjacency-list">{adjacencyList.map(({ vertex, neighbors }) => <div className="adjacency-list-row" key={vertex.id}><span className="adjacency-list-vertex" style={{ '--vertex-color': vertex.color ?? palette[0] } as React.CSSProperties}>{vertex.label}</span><span className="adjacency-separator">→</span><span className="adjacency-neighbors">{neighbors.length ? neighbors.join(', ') : '∅'}</span></div>)}</div></section>}
            {representation === 'incidence-matrix' && <section className="representation-card"><div className="representation-heading"><h3>Incidence matrix</h3><span>{directed ? 'tail −1 · head +1' : 'endpoint = 1'}</span></div><p>Rows are vertices; columns are edges. An undirected loop contributes 2.</p><MatrixView rows={vertices.map((vertex) => vertex.label)} columns={edges.map((_, index) => `e${index + 1}`)} values={incidenceMatrix} /></section>}
          </div>}
          <div className="inspector-footer"><div className="footer-logo"><span className="footer-mark"><Waypoints size={13} /></span>GraphLab <span className="footer-version">v1.0</span></div><button className="plain-icon" onClick={() => notify('GraphLab · Interactive graph theory workbench')} title="About"><CircleHelp size={15} /></button></div>
        </aside>
      </section>
      {selected && <div className="selection-popover"><div className="popover-heading"><span className="popover-color" style={{ background: selected.color }} />Vertex {selected.label}<button onClick={() => setSelectedVertex(null)}><X size={14} /></button></div><label>Label<input value={selected.label} maxLength={5} onChange={(e) => setVertices((items) => items.map((v) => v.id === selected.id ? { ...v, label: e.target.value } : v))} /></label><label className="color-picker-row">Vertex color<input type="color" value={selected.color ?? palette[0]} onChange={(e) => setVertices((items) => items.map((v) => v.id === selected.id ? { ...v, color: e.target.value } : v))} /></label><div className="popover-stats"><span>Degree <b>{degrees.get(selected.id)?.total}</b></span>{directed && <><span>In <b>{degrees.get(selected.id)?.in}</b></span><span>Out <b>{degrees.get(selected.id)?.out}</b></span></>}</div><div className="popover-actions"><button onClick={() => createEdgeBetween(selected.id, selected.id)} title="Add self-loop"><Copy size={13} /> Self-loop</button><button className="delete-action" onClick={removeSelected}><Trash2 size={13} /> Delete</button></div></div>}
      {selectedEdgeData && <div className="selection-popover edge-popover"><div className="popover-heading"><span className="edge-popover-icon"><Link2 size={14} /></span>Edge details<button onClick={() => setSelectedEdge(null)}><X size={14} /></button></div><div className="edge-endpoints"><span>{vertices.find((v) => v.id === selectedEdgeData.from)?.label}</span><i>{directed ? '→' : '—'}</i><span>{vertices.find((v) => v.id === selectedEdgeData.to)?.label}</span></div><label>Weight<input type="number" min="0" value={selectedEdgeData.weight} onChange={(e) => updateWeight(selectedEdgeData.id, Number(e.target.value))} /></label><p className="popover-hint">Drag the edge to adjust its curve.</p><div className="popover-actions"><button className="delete-action" onClick={removeSelected}><Trash2 size={13} /> Delete edge</button></div></div>}
      {toast && <div className="toast-message"><Check size={15} />{toast}</div>}
    </main>
  );
}

export default App;
