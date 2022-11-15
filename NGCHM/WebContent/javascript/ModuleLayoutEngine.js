class ModuleLayoutEngine {

  constructor(graph) {
    this.graph = graph;
    this.iterations = 500
    this.maxRepulsiveForceDistance = 6
    this.k = 2
    this.c = 0.01
    this.maxVertexMovement = 0.5
    this.layout()
  }

  static create(...args) {
    return new this(...args)
  }

  layout() {
    this.layoutPrepare()
    for (let i = 0; i < this.iterations; i++) {
      this.layoutIteration()
    }
    this.layoutCalcBounds()
  }

  layoutPrepare() {
    this.each(this.graph.nodes, (node) => {
      node.layoutPosX = 0
      node.layoutPosY = 0
      node.layoutForceX = 0
      node.layoutForceY = 0
    })
  }

    layoutCalcBounds() {
	let minx = Infinity;
	let maxx = -Infinity;
	let miny = Infinity;
	let maxy = -Infinity;

	this.each(this.graph.nodes, (node) => {
	    const x = node.layoutPosX;
	    const w = node.width || 0;
	    const y = node.layoutPosY;
	    const h = node.height || 0;

	    if ((x+w) > maxx) maxx = x + w;
	    if (x < minx) minx = x;
	    if ((y+h) > maxy) maxy = y + h;
	    if (y < miny) miny = y;
	})

	this.graph.layoutMinX = minx;
	this.graph.layoutMaxX = maxx;
	this.graph.layoutMinY = miny;
	this.graph.layoutMaxY = maxy;
    }


  layoutIteration() {
    // Forces on nodes due to node-node repulsions
    const prev = []
    this.each(this.graph.nodes, (node1) => {
      prev.forEach((node2) => {
        this.layoutRepulsive(node1, node2)
      })
      prev.push(node1)
    })

    // Forces on nodes due to edge attractions
    this.graph.edges.forEach((edge) => {
      this.layoutAttractive(edge)
    })

    // Move by the given force
    const maxHeight = 1000;
    const minY = this.graph.layoutMinY || 0;
    let maxLevel = 1;
    this.each(this.graph.nodes, (node) => { if (node.level === undefined) node.level = 1; });
    this.each(this.graph.nodes, (node) => { if (node.level > maxLevel) maxLevel = node.level; });
    const dY = maxHeight / maxLevel;

    this.each(this.graph.nodes, (node) => {
      let xmove = this.c * node.layoutForceX
      let ymove = this.c * node.layoutForceY

      const max = this.maxVertexMovement

      if (xmove > max) xmove = max
      if (xmove < -max) xmove = -max
      if (ymove > max) ymove = max
      if (ymove < -max) ymove = -max

      if (node.trace) console.log ({ m: 'Node move', id: node.id, c: this.c, fx: node.layoutForceX, xmove, fy: node.layoutForceY, ymove, node });

      node.layoutPosX += xmove
      //node.layoutPosY += ymove
      node.layoutPosY = node.level * dY;
      node.layoutForceX = 0
      node.layoutForceY = 0

    })
  }


  nodeSep (node1, node2) {
    let dx = node2.layoutPosX + (node2.width||0)/2  - node1.layoutPosX - (node1.width||0)/2;
    let dy = node2.layoutPosY + (node2.height||0)/2 - node1.layoutPosY - (node1.height||0)/2;
    let d2 = dx * dx + dy * dy;
    if (d2 < 0.01) {
      dx = 0.1 * Math.random() + 0.1;
      dy = 0.1 * Math.random() + 0.1;
      d2 = dx * dx + dy * dy;
    }
    const d = Math.sqrt(d2);
    return { dx, dy, d2, d };
  }

  layoutRepulsive(node1, node2) {
    if (!node1 || !node2) {
      return
    }
    const { dx, dy, d2, d } = this.nodeSep (node1, node2);
    if (d < 10*this.maxRepulsiveForceDistance) {
      const repulsiveForceX = this.k * this.k / Math.max(d,this.maxRepulsiveForceDistance);
      let repulsiveForceY = repulsiveForceX;
      if (node1.level > node2.level && node1.layoutPosY <= node2.layoutPosY) {
	  repulsiveForceY = 0;
      }
      if (node1.trace && node2.trace) console.log ({m: 'Node trace', node1: node1.id, node2: node2.id, repulsiveForceX, repulsiveForceY, d, maxD: this.maxRepulsiveForceDistance});
      node2.layoutForceX += repulsiveForceX * dx / d
      node2.layoutForceY += repulsiveForceY * dy / d
      node1.layoutForceX -= repulsiveForceX * dx / d
      node1.layoutForceY -= repulsiveForceY * dy / d
    } else if (node1.trace && node2.trace) {
      console.log ({m: 'Nodes too far apart', d, maxD: this.maxRepulsiveForceDistance});
    }
  }

  layoutAttractive(edge) {
    const node1 = edge.source;
    const node2 = edge.target;

    if (edge.trace) {
	node1.trace = true;
	node2.trace = true;
    }

    const { dx, dy, d2, d } = this.nodeSep (node1, node2);
    if (!edge.attraction) edge.attraction = edge.op == 'export' ? 1 : 0.15;

    let attractiveForceX = (dx*dx - 0.01) / this.k;
    attractiveForceX = attractiveForceX * (Math.log(edge.attraction) * 0.5 + 1);

    if (edge.op == 'export') attractiveForceX *= 2; else attractiveForceX *= 0.005;

    if (edge.directed) {
	if (node2.level <= node1.level) node2.level = node1.level + (edge.op == 'export' ? 1 : 2);
    }

    const limitedD = Math.min (d, this.maxRepulsiveForceDistance );
    node2.layoutForceX -= attractiveForceX * dx / limitedD;
    node1.layoutForceX += attractiveForceX * dx / limitedD;
    if (edge.trace) console.log ({ m: 'Edge trace', attractiveForceX, attractiveForceY, d, dx, dy, maxD: this.maxRepulsiveForceDistance });
  }

  each (nodes, fn) {
    for (let x in nodes) {
      fn (nodes[x]);
    }
  }

}
