const NgChm = {};
window["NgChm"] = NgChm; // Suddenly, this is needed now (2/5/23) for widget mode.  Can't see what changed. [BMB]

(function () {
  "use strict";

  const debug = false;
  const log = [];
  const definedNamespaces = [];

  // Function: exportToNS
  // This function is called from other JS files to define their individual namespaces.
  // The contents of iContent, if present, will be added to the namespace (even if it already exists).
  // The namespace will be returned.
  NgChm["exportToNS"] = exportToNS;
  NgChm["createNS"] = exportToNS;
  NgChm["importNS"] = importNS;
  NgChm["markFile"] = () => {}; // No-op in compiled code. Dev mode version defined below.

  var lastFile = "n/a";
  var importsBeforeDefinition = 0;

  function importNS(namespace) {
    return getNS(namespace, "import");
  }

  function exportToNS(namespace, content) {
    const ns = getNS(namespace, "export");
    // Add content if specified:
    if (content) {
      Object.assign(ns, content);
    }
    return ns;
  }

  function getNS(namespace, op) {
    let nsparts = namespace.split(".");

    // we want to be able to include or exclude the root namespace so we strip
    // it if it's in the namespace
    if (nsparts[0] === "NgChm") {
      nsparts = nsparts.slice(1);
    }

    // BEGIN EXCLUDE from production code.
    //
    // Determine javascript file name by creating an Error object
    // and extracting the file name from the stack trace.
    const err = new Error("Defining namespace " + namespace);
    const trace = err.stack.split("\n");
    const nindex = err.message.indexOf("NgChm.");
    let traceIdx = 2;
    if (trace[0].includes(err.message)) {
      // True on Chrome, false on Firefox.
      traceIdx++;
    }
    if (traceIdx < trace.length) {
      const jindex = trace[traceIdx].indexOf("javascript/");
      const qindex = trace[traceIdx].indexOf(".js:");
      if (nindex > 0 && jindex >= 0 && qindex >= 0) {
        lastFile = trace[traceIdx].substring(jindex + 11, qindex + 3);
        log.push({ op, ns: err.message.substr(nindex + 6), src: lastFile });
      }
    } else {
      lastFile = "chm.html";
    }
    if (debug) {
      trace.splice(1, 1);
      console.log(trace.join(""));
    }
    if (op === "export") {
      if (definedNamespaces.indexOf(namespace) < 0) {
        definedNamespaces.push(namespace);
      }
    }
    if (op == "import") {
      if (definedNamespaces.indexOf(namespace) < 0) {
        importsBeforeDefinition++;
        console.log(
          "Namespace imported before definition #" +
            importsBeforeDefinition +
            ": " +
            namespace +
            " in " +
            lastFile,
        );
      }
    }
    // END EXCLUDE

    let parent = NgChm;
    // loop through the parts and create a nested namespace if necessary
    for (let i = 0; i < nsparts.length; i++) {
      const partname = nsparts[i];
      // check if the current parent already has the namespace declared
      // if it isn't, then create it
      if (typeof parent[partname] === "undefined") {
        parent[partname] = {};
      }
      // get a reference to the deepest element in the hierarchy so far
      parent = parent[partname];
    }
    // The element for the last namespace field is now constructed
    // with empty intermediate namespaces if needed and can be used.

    // We return the element for the last namespace field.
    return parent;
  }

  // BEGIN EXCLUDE from production code.
  //
  // The code from this comment block until the matching end block is removed
  // by the compiler.
  NgChm["getLog"] = getLog;
  function getLog() {
    return log.slice(0);
  }

  var scriptLoaded = false;

  function dynload(srcs, next) {
    if (srcs.length == 0) {
      next();
      console.log("next executed");
    } else {
      const script = document.createElement("SCRIPT");
      script.type = "text/javascript";
      script.src = srcs.shift();
      script.onload = () => {
        console.log("Loaded " + script.src);
        dynload(srcs, next);
      };
      script.onerror = () => {
        console.error("Error loading " + script.src);
      };
      document.head.appendChild(script);
    }
  }

  var canvas;
  const fileColorTable = {};
  const markedFileColor = "#eeffee"; // Use slight green color for marked files.
  const unmarkedFileColor = "#fff7f7"; // Use slight pink color for unmarked files.
  const moduleColor = "#eeeeff"; // Use slight blue color for modules.

  // Mark the current file.  Marked files are displayed in a distinct color.
  NgChm["markFile"] = markFile;
  function markFile() {
    const err = new Error("Source file done");
    const trace = err.stack.split("\n");
    let traceIdx = 1;
    if (trace[0].includes(err.message)) {
      // True on Chrome, false on Firefox.
      traceIdx++;
    }
    const jindex = trace[traceIdx].indexOf("javascript/");
    const qindex = trace[traceIdx].indexOf(".js:");
    if (jindex >= 0 && qindex >= 0) {
      lastFile = trace[traceIdx].substring(jindex + 11, qindex + 3);
      fileColorTable[lastFile] = markedFileColor;
    }
  }

  NgChm["dracula"] = dracula;
  function dracula() {
    if (scriptLoaded) {
      drawGraph();
    } else {
      dynload(
        [
          "javascript/lib/raphael.js",
          "javascript/lib/dracula.min.js",
          "javascript/ModuleLayoutEngine.js",
        ],
        () => {
          drawGraph();
        },
      );
    }

    const canvasWidth = 1500;
    const canvasHeight = 1500;

    function drawGraph(script) {
      if (scriptLoaded) {
        canvas.replaceChildren();
      } else {
        canvas = document.createElement("CANVAS");
        const content = document.getElementById("content");
        canvas.id = "dracula";
        canvas.style.display = "block";
        canvas.style.position = "relative";
        canvas.style.width = content.innerWidth;
        canvas.style.height = content.innerHeight;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        [...content.children].forEach((ch) => {
          if (ch != canvas) {
            ch.style.display = "none";
          }
        });
        content.appendChild(canvas);
        canvas.addEventListener("mousedown", mouseDown, { passive: true });
        canvas.addEventListener("mousemove", mouseDrag, { passive: true });
        canvas.addEventListener("mouseup", mouseUp, { passive: true });
        canvas.addEventListener("mouseout", mouseUp, { passive: true });
        scriptLoaded = true;
      }

      // Add unique edges to the graph.
      const uniqEdges = [];
      const g = new Dracula.Graph();
      log.forEach((entry) => {
        const key = JSON.stringify([entry.ns, entry.src]);
        if (uniqEdges.indexOf(key) >= 0) return;
        uniqEdges.push(key);
        if (entry.op == "export") {
          g.addEdge(entry.ns, entry.src, {
            directed: true,
            color: "#aaaaff",
            op: entry.op,
          });
        } else {
          g.addEdge(entry.src, entry.ns, {
            directed: true,
            color: "#ffaaaa",
            op: entry.op,
          });
        }
      });
      // Copy edge properties in style to the edge itself.
      g.edges.forEach((edge) => {
        if (edge.style.directed) edge.directed = edge.style.directed;
        edge.op = edge.style.op;
      });

      if (importsBeforeDefinition > 0) {
        console.warn("Module layout not designed for cyclic import graphs.");
      }
      const layout = new ModuleLayoutEngine(g);

      // Determine the maximum width of any node.
      const ctx = canvas.getContext("2d");
      const maxw = Object.entries(layout.graph.nodes)
        .map(([key, node]) => Math.ceil(ctx.measureText(key).width + 4))
        .reduce((t, v) => Math.max(t, v));
      const tt = {};

      var count = 0;
      requestAnimationFrame(animate);

      var dragging = false;
      var enabled = true;
      var dragNode;

      var oldc = 0;

      dracula.start = function () {
        setEnabled(true);
        requestAnimationFrame(animate);
        layout.c = oldc; // Restore previous speed.
      };

      dracula.stop = function () {
        setEnabled(false);
        oldc = layout.c; // Save current speed
        layout.c = 0.000001; // Reduce speeed to a crawl.
      };

      function setEnabled(value) {
        enabled = value;
      }

      function mouseDown(ev) {
        const m = Object.entries(layout.graph.nodes).filter(([key, node]) => {
          const w = Math.ceil(ctx.measureText(key).width + 4) / tt.xs;
          const h = boxHeight / tt.ys;
          const bb = canvas.getBoundingClientRect();
          const x = xit(ev.clientX - bb.x);
          const y = yit(ev.clientY - bb.y);

          const hitX = x >= node.layoutPosX && x <= node.layoutPosX + w;
          const hitY = y >= node.layoutPosY && y <= node.layoutPosY + h;
          return hitX && hitY;
        });
        if (m.length > 0) {
          dragNode = m[0][1];
          dragging = true;
        }
      }

      function mouseDrag(ev) {
        if (dragging) {
          dragNode.layoutPosX += ev.movementX / tt.xs;
          dragNode.layoutPosY += ev.movementY / tt.ys;
          if (!enabled) requestAnimationFrame(animate);
        }
      }

      function mouseUp(ev) {
        dragging = false;
      }

      function nodeColor(id) {
        if (id.includes(".js")) {
          const color = fileColorTable[id];
          return color || unmarkedFileColor;
        } else {
          return moduleColor;
        }
      }

      // Key font metrics.
      // Current. ctx.measuretext includes:
      // - font: 10px sans-serif
      // - fontBoundingBoxAscent: 10
      // - fontBoundingBoxDescent: 2
      const boxHeight = 22; // Pixels from top of box to bottom.
      const boxBaseLine = 16; // Pixels from top of box.

      function animate() {
        layout.layoutIteration();
        layout.layoutCalcBounds();
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.lineWidth = 1;
        tt.xp = -layout.graph.layoutMinX;
        tt.xs = (canvasWidth - 3) / (layout.graph.layoutMaxX + tt.xp);
        tt.yp = -layout.graph.layoutMinY;
        tt.ys = (canvasHeight - 40) / (layout.graph.layoutMaxY + tt.yp);

        // Draw the nodes.
        Object.entries(layout.graph.nodes).forEach(([key, node]) => {
          const w = Math.ceil(ctx.measureText(key).width + 4);
          const x = xt(node.layoutPosX);
          const y = yt(node.layoutPosY);
          node.width = xit(x + w) - xit(x);
          ctx.fillStyle = nodeColor(node.id);
          ctx.fillRect(x, y, w, boxHeight);
          ctx.strokeStyle = "#000000";
          ctx.strokeRect(x, y, w, boxHeight);
          ctx.fillStyle = "#000000";
          ctx.fillText(key, x + 2, y + boxBaseLine);
        });

        // Compute best way to draw/route the edges.
        // Copy key values for each edge into arrays.
        const sourceX = [];
        const sourceY = [];
        const sourceW = [];

        const targetX = [];
        const targetY = [];
        const targetW = [];

        Object.entries(layout.graph.edges).forEach(([key, edge]) => {
          edge.sourceX = xt(edge.source.layoutPosX);
          sourceX.push(edge.sourceX);
          edge.sourceY = yt(edge.source.layoutPosY);
          sourceY.push(edge.sourceY);
          edge.sourceW = Math.ceil(ctx.measureText(edge.source.id).width + 4);
          sourceW.push(edge.sourceW);

          edge.targetX = xt(edge.target.layoutPosX);
          targetX.push(edge.targetX);
          edge.targetY = yt(edge.target.layoutPosY);
          targetY.push(edge.targetY);
          edge.targetW = Math.ceil(ctx.measureText(edge.target.id).width + 4);
          targetW.push(edge.targetW);
        });

        // Compute best originating X positions for each edge.
        // Divide the width of each originating node into N edges.
        // Edges may move to the left or right. Treat each separately.
        // Highest destination is most left or right position.
        // If two destinations at same level, leftmost gets leftmost, etc.
        const uniqSrcX = [];
        sourceX.forEach((x) => {
          if (uniqSrcX.indexOf(x) == -1) uniqSrcX.push(x);
        });
        const newSourceX = [];
        newSourceX.length = sourceX.length;
        uniqSrcX.forEach((ux) => {
          let posn = 0;
          const details = sourceX
            .map((x, index) => ({
              x: x,
              index: index,
              targetY: targetY[index],
              targetX: targetX[index],
              width: sourceW[index],
            }))
            .filter((det) => det.x == ux)
            .map((det) => {
              det.posn = posn++;
              return det;
            });
          const N = details.length;
          let changed = true;
          // Bubble sort!, but we expect N to be small.
          while (changed) {
            changed = false;
            for (let i = 0; i < N; i++) {
              let posn = details[i].posn;
              if (details[i].targetX < ux && posn > 0) {
                // Target is on the left.
                let leftidx = details
                  .map((det, idx) => [det, idx])
                  .filter((di) => di[0].posn == posn - 1);
                leftidx = leftidx[0];
                leftidx = leftidx[1];
                if (
                  details[i].targetY < details[leftidx].targetY ||
                  (details[i].targetY == details[leftidx].targetY &&
                    details[i].targetX < details[leftidx].targetX)
                ) {
                  let tmp = details[i].posn;
                  details[i].posn = details[leftidx].posn;
                  details[leftidx].posn = tmp;
                  changed = true;
                }
              } else if (details[i].targetX >= ux && posn < N - 1) {
                // Target is on the right.
                let rightidx = details
                  .map((det, idx) => [det, idx])
                  .filter((di) => di[0].posn == posn + 1)[0][1];
                if (
                  details[i].targetY < details[rightidx].targetY ||
                  (details[i].targetY == details[rightidx].targetY &&
                    details[i].targetX >= details[rightidx].targetX)
                ) {
                  let tmp = details[i].posn;
                  details[i].posn = details[rightidx].posn;
                  details[rightidx].posn = tmp;
                  changed = true;
                }
              }
            }
          }
          // Assign each edge to one the N outlet positions on the bottom of the node
          // using the above determined order.
          const dX = details[0].width / (N + 1);
          details.forEach((det) => {
            newSourceX[det.index] = ux + (det.posn + 1) * dX;
          });
        });

        // Compute the target X positions of the edges.
        // Divide the width of the target node into N edges.
        // Edges may come from the left or right. Treat each separately.
        // Position is based on left-to-right order of the source positions.
        const uniqTgtX = [];
        targetX.forEach((x) => {
          if (uniqTgtX.indexOf(x) == -1) uniqTgtX.push(x);
        });
        const newTargetX = [];
        newTargetX.length = sourceX.length;
        uniqTgtX.forEach((ux) => {
          const details = targetX
            .map((x, index) => ({
              x: x,
              index: index,
              sourceY: sourceY[index],
              sourceX: sourceX[index],
              width: targetW[index],
            }))
            .filter((det) => det.x == ux);
          const N = details.length;
          let changed = true;
          // Sort into increasing X position of source node.
          details.sort((a, b) => Math.sign(a.sourceX - b.sourceX));
          const dX = details[0].width / (N + 1);
          details.forEach((det, idx) => {
            newTargetX[det.index] = ux + (idx + 1) * dX;
          });
        });

        // Compute Y position of central bars.  Divide gap between node levels into N
        // unique positions and assign each bar a unique position.
        // Break bars into groups that do not overlap in the X direction.
        const barY = [];
        const uniqY = [];
        targetY.forEach((y) => {
          if (uniqY.indexOf(y) == -1) uniqY.push(y);
        });
        barY.length = targetY.length;
        uniqY.forEach((uy) => {
          const details = targetY
            .map((y, index) => {
              let det = {
                y: y,
                index: index,
                sourceY: sourceY[index],
                sourceX: sourceX[index],
                targetX: newTargetX[index],
              };
              det.minX = det.sourceX < det.targetX ? det.sourceX : det.targetX;
              det.maxX = det.sourceX > det.targetX ? det.sourceX : det.targetX;
              return det;
            })
            .filter((det) => det.y == uy);
          const N = details.length;
          details.sort((a, b) => {
            if (a.minX < b.minX) return -1;
            if (b.minX < a.minX) return 1;
            return 0;
          });

          // Iterate through each group of lines.
          let grpStart = 0;
          while (grpStart < N) {
            // Find end of group: end of lines or next element starts after extent of current group.
            let grpEnd = grpStart + 1; // Element after current group so far.
            let grpEndX = details[grpStart].maxX; // X limit of current group.
            while (grpEnd < N - 1 && details[grpEnd].minX < grpEndX) {
              // grpEnd is part of the current group.
              // Extend x limit of group if needed.
              if (details[grpEnd].maxX > grpEndX) {
                grpEndX = details[grpEnd].maxX;
              }
              grpEnd++;
            }
            const group = details.slice(grpStart, grpEnd);
            // Sort bars in the group.
            group.sort(
              (a, b) =>
                Math.sign(a.sourceX - b.sourceX) *
                Math.sign(b.sourceY - a.sourceY),
            );
            // Find maximum y of ALL nodes within the x limits of the group and above the current y.
            let maxSourceY = 0;
            Object.entries(layout.graph.nodes).forEach(([key, node]) => {
              const x = xt(node.layoutPosX);
              const y = yt(node.layoutPosY);
              if (
                y < uy &&
                x >= group[0].minX &&
                x <= grpEndX &&
                y > maxSourceY
              ) {
                maxSourceY = y;
              }
            });
            // Compute and assign equally spaced horizontal bars.
            // Include a two puxel margin above/below the group of lines.
            const dY = (uy - maxSourceY - boxHeight - 4) / (group.length + 1);
            let nextY = maxSourceY + boxHeight + 2 + dY;
            group.forEach((det) => {
              barY[det.index] = nextY;
              nextY += dY;
            });
            // Advance to next group.
            grpStart = grpEnd;
          }
        });

        // Copy computed properties into the graph edges.
        let index = 0;
        Object.entries(layout.graph.edges).forEach(([key, edge]) => {
          edge.srcX = newSourceX[index];
          edge.tgtX = newTargetX[index];
          edge.barY = barY[index];
          index++;
        });

        // Draw the edges.
        ctx.lineWidth = 2;
        Object.entries(layout.graph.edges).forEach(([key, edge]) => {
          ctx.beginPath();
          ctx.strokeStyle = edge.style.color;
          let sx = xt(edge.source.layoutPosX);
          let sy = yt(edge.source.layoutPosY);
          const sw = Math.ceil(ctx.measureText(edge.source.id).width + 4);
          let tx = xt(edge.target.layoutPosX);
          let ty = edge.targetY; // yt(edge.target.layoutPosY);
          const tw = Math.ceil(ctx.measureText(edge.target.id).width + 4);
          if (tx > sx + sw) {
            sx += sw;
          } else if (sx > tx + tw) {
            tx += tw;
          } else {
            sx += sw / 2;
            tx += tw / 2;
          }
          if (ty > sy + boxHeight) {
            sy += boxHeight;
          } else if (sy > ty + boxHeight) {
            ty += boxHeight;
          } else {
            sy += 15;
            ty += 15;
          }
          // Draw from source XY down to bar Y, across to target X, down to target XY.
          ctx.moveTo(edge.srcX, sy);
          ctx.lineTo(edge.srcX, edge.barY);
          ctx.lineTo(edge.tgtX, edge.barY);
          ctx.lineTo(edge.tgtX, ty);
          ctx.stroke();
        });
        count++;
        if (enabled) requestAnimationFrame(animate);
      }

      function xt(x) {
        return 2 + (x + tt.xp) * tt.xs;
      }
      function xit(x) {
        return (x - 2) / tt.xs - tt.xp;
      }

      function yt(y) {
        return 2 + (y + tt.yp) * tt.ys;
      }
      function yit(y) {
        return (y - 2) / tt.ys - tt.yp;
      }
    }
  }
  // End of the code removed from the system by the compiler.
  //
  // END EXCLUDE
})();
