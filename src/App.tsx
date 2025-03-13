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
  const [dimensions] = useState({ width: 1600, height: 830 });

  useEffect(() => {
    if (!svgRef.current) return;
    const data = transformDataToTree(jsonData);

    const treeLayout = d3.tree<TreeNode>().nodeSize([50, 200]);

    const root = d3.hierarchy(data);
    treeLayout(root);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg
      .append("g")
      .attr("transform", `translate(${dimensions.width / 4}, 50)`);
    gRef.current = g.node();

    // Create zoom behavior (Disable zoom on scroll)
    zoomRef.current = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3]) // Min zoom 0.5, max 3
      .filter((event) => {
        // Allow zoom only on ctrl + scroll or pinch gesture
        return !event.ctrlKey && event.type !== "wheel";
      })
      .on("zoom", (event) => {
        d3.select(gRef.current).attr("transform", event.transform);
      });

    svg.call(zoomRef.current);

    // Enable scrolling for panning (override default zoom behavior)
    svg.on("wheel", (event) => {
      event.preventDefault();
      const transform = d3.zoomTransform(svg.node() as SVGSVGElement);
      svg.call(
        zoomRef.current!.transform,
        transform.translate(0, -event.deltaY * 0.5) // Move up/down on scroll
      );
    });

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

    // Centering on "DataArchiver"
    const DataArchiverNode = root
      .descendants()
      .find((node) => node.data.name === "DataArchiver");
    if (DataArchiverNode) {
      const { x, y } = DataArchiverNode as d3.HierarchyPointNode<TreeNode>;
      const centerX = dimensions.width / 2;
      const centerY = dimensions.height / 2;
      const translateX = centerX - y;
      const translateY = centerY - x;

      svg.call(
        zoomRef.current.transform,
        d3.zoomIdentity.translate(translateX, translateY).scale(1)
      );
    }
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
    if (!svgRef.current || !zoomRef.current) return;

    const svg = d3.select(svgRef.current);
    const root = d3.hierarchy(transformDataToTree(jsonData));
    const treeLayout = d3.tree<TreeNode>().nodeSize([50, 200]);
    treeLayout(root);

    // 🔍 Find the "DataArchiver" node
    const DataArchiverNode = root
      .descendants()
      .find((node) => node.data.name === "DataArchiver");

    if (DataArchiverNode) {
      const { x, y } = DataArchiverNode as d3.HierarchyPointNode<TreeNode>; // Node's position in the tree

      // Calculate the new translation to center "DataArchiver"
      const centerX = dimensions.width / 2;
      const centerY = dimensions.height / 2;
      const translateX = centerX - y;
      const translateY = centerY - x;

      svg
        .transition()
        .duration(750)
        .call(
          zoomRef.current.transform,
          d3.zoomIdentity.translate(translateX, translateY).scale(1)
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
