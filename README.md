# GraphLab

GraphLab is an interactive graph theory workbench for building, editing, and exploring graphs in the browser.

## Features

- Create vertices and connect them with edges, including parallel edges and self-loops.
- Work with directed or undirected graphs, including disconnected graphs.
- Drag vertices to rearrange the canvas and drag edges to bend them.
- Hold Ctrl while dragging between vertices to add an edge; hold Shift to add a directed edge.
- Drag self-loops to adjust their size, and add parallel edges without them overlapping.
- Edit vertex labels, colors, and edge weights; toggle weights and graph direction.
- Start with a randomized graph, generate another at any time, or clear the canvas.
- Inspect vertex degrees, connected components, graph density, loops, and parallel edges.
- Inspect average degree, completeness, bipartiteness, and regularity.
- View adjacency matrices, adjacency lists, and incidence matrices.
- Animate Euler trails and compute a minimum spanning tree with Kruskal’s algorithm.
- Import and export graph data as JSON.

## Run locally

Install dependencies with `npm install`, then start the development server with `npm run dev`. Use `npm run build` to type-check and create a production build.

## Editing

Choose a tool in the left rail. Select **Vertex** and click the canvas to add one; select **Edge** and click two vertices to connect them. In **Select** mode, drag vertices or edges, then click an element to edit its details. Choose **Delete** to remove elements.

In **Select** mode, Ctrl-drag from one vertex to another to create an edge, or Shift-drag to create a directed edge. Select a vertex to edit its color. Use **Random** to generate a new graph and **Clear graph** to empty the canvas.

Open **Matrices** in the inspector to switch between adjacency matrix, adjacency list, and incidence matrix. Matrix entries count parallel edges; undirected self-loops contribute 2 to degree and the diagonal. Graph properties update live as vertices and edges change. Use **Animate Euler trail** in the Algorithms panel to play an Euler trail across the canvas when one exists.
