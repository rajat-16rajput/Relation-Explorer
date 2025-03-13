import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import jsonData from "./sampleData.json"; // Import the JSON file
import "./TreeDiagram.scss";

interface TreeNode {
  name: string;
  expanded?: boolean;
  children?: TreeNode[];
}

// Function to transform JSON into tree format with expandable nodes
const transformDataToTree = (data: any): TreeNode => ({
  name: data.name,
  expanded: true, // Root is always expanded
  children: [
    {
      name: "Applications",
      expanded: false,
      children: data.applications.map((app: any) => ({ name: app.name })),
    },
    {
      name: "Instances",
      expanded: false,
      children: data.instances.map((inst: any) => ({ name: inst.name })),
    },
    {
      name: "Capabilities",
      expanded: false,
      children: data.capabilities.map((cap: any) => ({ name: cap.name })),
    },
  ],
});

const TreeDiagram: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [dimensions] = useState({ width: 1600, height: 830 });
  const [treeData, setTreeData] = useState<TreeNode>(
    transformDataToTree(jsonData)
  );
  const [transformState, setTransformState] = useState<d3.ZoomTransform | null>(
    null
  );

  // Function to toggle expansion of a node without resetting zoom/pan
  const toggleNode = (node: TreeNode) => {
    node.expanded = !node.expanded;

    // Preserve zoom & pan before updating
    const currentTransform = d3.zoomTransform(svgRef.current as SVGSVGElement);
    setTransformState(currentTransform);

    // Update tree data
    setTreeData((prevData) => ({ ...prevData }));
    // If the clicked node is a parent, recenter
    if (node.children) {
      resetZoom();
    }
  };

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous elements

    const initialX: number = 100; // Move tree closer to the left
    const initialY: number = dimensions.height / 2; // Center vertically

    const g = svg
      .append<SVGGElement>("g")
      .attr("transform", `translate(${initialX}, ${initialY})`);

    gRef.current = g.node();

    const treeLayout = d3.tree<TreeNode>().nodeSize([50, 200]);
    const root = d3.hierarchy(treeData, (d) => (d.expanded ? d.children : [])); // Show only expanded children
    treeLayout(root);

    // Zoom configuration
    zoomRef.current = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .filter((event) => !event.ctrlKey && event.type !== "wheel") // Prevent zoom on normal scroll
      .on("zoom", (event) => {
        d3.select(gRef.current).attr("transform", event.transform);
        setTransformState(event.transform); // Store the zoom state
      });

    svg.call(zoomRef.current);

    // Restore zoom & pan state if available
    if (transformState) {
      svg.call(zoomRef.current.transform, transformState);
    }

    // Enable scrolling for panning (override default zoom behavior)
    svg.on("wheel", (event) => {
      event.preventDefault();
      const transform = d3.zoomTransform(svg.node() as SVGSVGElement);
      svg.call(
        zoomRef.current!.transform,
        transform.translate(0, -event.deltaY * 0.5)
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
      .attr("transform", (d) => `translate(${d.y},${d.x})`)
      .on("click", (_, d) => toggleNode(d.data));

    nodes
      .append("circle")
      .attr("r", 8)
      .attr("fill", (d) => (d.data.expanded ? "#69b3a2" : "#ff7f0e")) // Change color if expanded
      .attr("stroke", "#000");

    nodes
      .append("text")
      .attr("dx", 12)
      .attr("dy", 5)
      .text((d) => d.data.name)
      .attr("font-size", "12px");
    resetZoom();
  }, [treeData]); // Preserve zoom & pan state

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

    const DataArchiverNode = root
      .descendants()
      .find((node) => node.data.name === "DataArchiver");

    if (DataArchiverNode) {
      const { x, y } = DataArchiverNode as d3.HierarchyPointNode<TreeNode>;
      // const centerX = dimensions.width / 2;
      const centerX = 100;
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

      setTransformState(
        d3.zoomIdentity.translate(translateX, translateY).scale(1)
      ); // Update state
    }
  };

  return (
    <div className="tree-container">
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
