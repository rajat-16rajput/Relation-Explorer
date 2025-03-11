// import React, { useEffect, useRef, useState } from "react";
// import * as d3 from "d3";
// import jsonData from "./sampleData.json"; // Import the JSON file
// import "./TreeDiagram.scss";

// interface TreeNode {
//   name: string;
//   children?: TreeNode[];
// }

// // Function to transform JSON into tree format
// const transformDataToTree = (data: any): TreeNode => ({
//   name: data.name,
//   children: [
//     {
//       name: "Applications",
//       children: data.applications.map((app: any) => ({ name: app.name })),
//     },
//     {
//       name: "Instances",
//       children: data.instances.map((inst: any) => ({ name: inst.name })),
//     },
//     {
//       name: "Capabilities",
//       children: data.capabilities.map((cap: any) => ({ name: cap.name })),
//     },
//   ],
// });

// const TreeDiagram: React.FC = () => {
//   const svgRef = useRef<SVGSVGElement>(null);
//   const [dimensions] = useState({ width: 1200, height: 800 });

//   useEffect(() => {
//     if (!svgRef.current) return;
//     const data = transformDataToTree(jsonData);

//     //########
//     const treeLayout = d3.tree<TreeNode>().nodeSize([50, 200]);
//     const zoom = d3.zoom<SVGSVGElement, unknown>().on("zoom", (event) => {
//       g.attr("transform", event.transform);
//     });
//     d3.select(svgRef.current).call(zoom);
//     //########

//     const root = d3.hierarchy(data);
//     treeLayout(root);

//     root.eachBefore((d) => {
//       (d as d3.HierarchyPointNode<TreeNode>).x *= 1.5;
//     });

//     const svg = d3.select(svgRef.current);
//     svg.selectAll("*").remove();
//     const g = svg.append("g").attr("transform", "translate(80,40)");

//     // Create Links
//     const linkGenerator = d3
//       .linkVertical<
//         d3.HierarchyPointLink<TreeNode>,
//         d3.HierarchyPointNode<TreeNode>
//       >()
//       .x((d) => d.y ?? 0) // Ensure `y` is always a number
//       .y((d) => d.x ?? 0); // Ensure `x` is always a number

//     g.selectAll(".link")
//       .data(root.links() as d3.HierarchyPointLink<TreeNode>[]) // Ensure correct typing
//       .enter()
//       .append("path")
//       .attr("class", "link")
//       .attr(
//         "d",
//         (d) => linkGenerator(d as d3.HierarchyPointLink<TreeNode>) || ""
//       ) // Type assertion
//       .attr("stroke", "#ccc")
//       .attr("fill", "none");

//     // Create Nodes
//     const nodes = g
//       .selectAll(".node")
//       .data(root.descendants())
//       .enter()
//       .append("g")
//       .attr("class", "node")
//       .attr("transform", (d) => `translate(${d.y},${d.x})`);

//     nodes
//       .append("circle")
//       .attr("r", 8)
//       .attr("fill", "#69b3a2")
//       .attr("stroke", "#000");

//     nodes
//       .append("text")
//       .attr("dx", 12)
//       .attr("dy", 5)
//       .text((d) => d.data.name)
//       .attr("font-size", "12px");

//     // const zoom = d3.zoom<SVGSVGElement, unknown>().on("zoom", (event) => {
//     //   g.attr("transform", event.transform);
//     // });

//     // d3.select(svgRef.current).call(zoom);
//   }, []);

//   return (
//     <div className="tree-container">
//       <svg
//         ref={svgRef}
//         width={dimensions.width}
//         height={dimensions.height}
//       ></svg>
//       <div>
//         <button>Zoom in</button>
//         <button>Zoom out</button>
//         <button>Reset</button>
//       </div>
//     </div>
//   );
// };

// export default TreeDiagram;

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import jsonData from "./sampleData.json"; // Import the JSON file
import "./TreeDiagram.scss";

interface TreeNode {
  name: string;
  children?: TreeNode[];
}

// Function to transform JSON into tree format
const transformDataToTree = (data: any): TreeNode => ({
  name: data.name,
  children: [
    {
      name: "Applications",
      children: data.applications.map((app: any) => ({ name: app.name })),
    },
    {
      name: "Instances",
      children: data.instances.map((inst: any) => ({ name: inst.name })),
    },
    {
      name: "Capabilities",
      children: data.capabilities.map((cap: any) => ({ name: cap.name })),
    },
  ],
});

const TreeDiagram: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [dimensions] = useState({ width: 1600, height: 800 });

  useEffect(() => {
    if (!svgRef.current) return;
    const data = transformDataToTree(jsonData);

    const treeLayout = d3.tree<TreeNode>().nodeSize([50, 200]);

    const root = d3.hierarchy(data);
    treeLayout(root);

    // Select the SVG and clear previous content
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Create the main group element
    const g = svg
      .append("g")
      .attr("transform", `translate(${dimensions.width / 4}, 50)`);
    gRef.current = g.node(); // Store reference to the `<g>` group

    // Create zoom behavior
    zoomRef.current = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3]) // min zoom 0.5, max 3
      .on("zoom", (event) => {
        d3.select(gRef.current).attr("transform", event.transform);
      });

    svg.call(zoomRef.current); // to apply the zoom behaviour

    // Create Links
    const linkGenerator = d3
      .linkVertical<
        d3.HierarchyPointLink<TreeNode>,
        d3.HierarchyPointNode<TreeNode>
      >()
      .x((d) => d.y)
      .y((d) => d.x);

    g.selectAll(".link")
      .data(root.links() as d3.HierarchyPointLink<TreeNode>[])
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", (d) => linkGenerator(d) || "")
      .attr("stroke", "#ccc")
      .attr("fill", "none");

    // Create Nodes
    const nodes = g
      .selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.y},${d.x})`);

    nodes
      .append("circle")
      .attr("r", 8)
      .attr("fill", "#69b3a2")
      .attr("stroke", "#000");

    nodes
      .append("text")
      .attr("dx", 12)
      .attr("dy", 5)
      .text((d) => d.data.name)
      .attr("font-size", "12px");

    // Set initial zoom position
    svg.call(
      zoomRef.current.transform,
      d3.zoomIdentity.translate(dimensions.width / 4, 50)
    );
  }, [dimensions]);

  // Zoom Functions
  const zoomIn = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 1.2);
    }
  };
  const zoomOut = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 0.8);
    }
  };
  const resetZoom = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(750)
        .call(
          zoomRef.current.transform,
          d3.zoomIdentity.translate(dimensions.width / 4, 50)
        );
    }
  };

  return (
    <div className="tree-container">
      {/* <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
      ></svg> */}

      <div className="result-conatainer">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          width="100%"
          height="100%"
        ></svg>
        <div className="buttons">
          <button onClick={zoomIn}>Zoom in</button>
          <button onClick={zoomOut}>Zoom out</button>
          <button onClick={resetZoom}>Reset</button>
        </div>
      </div>
    </div>
  );
};

export default TreeDiagram;
