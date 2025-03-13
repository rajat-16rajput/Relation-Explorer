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

  //default state behaviour
  // const [initialTreeData] = useState<TreeNode>(transformDataToTree(jsonData));
  // const [initialTransformState, setInitialTransformState] =
  //   useState<d3.ZoomTransform | null>(null);

  const initialTransformState = useRef<d3.ZoomTransform | null>(null);

  // // Function to toggle expansion of a node without resetting zoom/pan - working
  // const toggleNode = (node: TreeNode, parent?: TreeNode) => {
  //   node.expanded = !node.expanded; // Toggle expand/collapse

  //   // Preserve zoom & pan before updating
  //   const currentTransform = d3.zoomTransform(svgRef.current as SVGSVGElement);
  //   setTransformState(currentTransform);

  //   // Update tree data
  //   setTreeData((prevData) => ({ ...prevData }));

  //   // Focus on the **expanded node** when opening OR focus on **parent node** when collapsing
  //   if (node.expanded) {
  //     focusOnNode(node);
  //   } else if (parent) {
  //     focusOnNode(parent); // Move back to parent
  //   }
  // };

  // Function to toggle expansion of a node while collapsing siblings
  const toggleNode = (node: TreeNode, parent?: TreeNode) => {
    node.expanded = !node.expanded; // Toggle expand/collapse

    // Collapse all sibling nodes when expanding a node
    if (node.expanded && parent?.children) {
      parent.children.forEach((sibling) => {
        if (sibling !== node) {
          sibling.expanded = false; // Collapse sibling nodes
        }
      });
    }

    // Preserve zoom & pan before updating
    const currentTransform = d3.zoomTransform(svgRef.current as SVGSVGElement);
    setTransformState(currentTransform);

    // Update tree data
    setTreeData((prevData) => ({ ...prevData }));

    // Focus on the expanded node when opening OR focus on the parent when collapsing
    // if (node.expanded) {
    //   focusOnNode(node);
    // } else if (parent) {
    //   focusOnNode(parent);
    // }
  };

  // Function to smoothly move view to focus on the expanded node
  const focusOnNode = (targetNode: TreeNode) => {
    if (!svgRef.current || !zoomRef.current) return;

    const svg = d3.select(svgRef.current);
    const root = d3.hierarchy(treeData, (d) => (d.expanded ? d.children : []));
    const treeLayout = d3.tree<TreeNode>().nodeSize([50, 200]);
    treeLayout(root);

    // Find the target node's position
    const target = root
      .descendants()
      .find((node) => node.data.name === targetNode.name);

    if (target) {
      const { x, y } = target as d3.HierarchyPointNode<TreeNode>;

      const centerX = 100; // Keep X fixed for a left-aligned tree
      const centerY = dimensions.height / 2; // Center vertically

      // Calculate translation
      const translateX = centerX - y;
      const translateY = centerY - x;

      // Smooth transition to the new position
      svg
        .transition()
        .duration(750)
        .call(
          zoomRef.current.transform,
          d3.zoomIdentity.translate(translateX, translateY).scale(1)
        );

      setTransformState(
        d3.zoomIdentity.translate(translateX, translateY).scale(1)
      );
    }
    // resetZoom();
  };

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous elements

    const initialX = 100;
    const initialY = dimensions.height / 2;

    const g = svg
      .append<SVGGElement>("g")
      .attr("transform", `translate(${initialX}, ${initialY})`);

    gRef.current = g.node();

    // Create tree layout
    const treeLayout = d3.tree<TreeNode>().nodeSize([50, 200]);
    const root = d3.hierarchy(treeData, (d) => (d.expanded ? d.children : []));
    treeLayout(root);

    if (!zoomRef.current) {
      // ✅ Configure zoom (Ctrl + Scroll OR Pinch Zoom)
      zoomRef.current = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.5, 3]) // Set zoom limits
        // .filter(
        //   (event) => event.ctrlKey || event.type.startsWith("touch") // Allow only Ctrl+Scroll & Pinch Zoom
        // )
        .filter((event) => {
          // Get bounding box of the SVG
          const svgBounds = svgRef.current?.getBoundingClientRect();
          const { clientX, clientY } = event;

          // Check if cursor is inside the SVG bounding box
          const isInsideSVG =
            svgBounds &&
            clientX >= svgBounds.left &&
            clientX <= svgBounds.right &&
            clientY >= svgBounds.top &&
            clientY <= svgBounds.bottom;

          // Allow zoom only when inside SVG and when Ctrl is pressed or using pinch zoom
          return (
            isInsideSVG && (event.ctrlKey || event.type.startsWith("touch"))
          );
        })
        .wheelDelta((event) => {
          return event.deltaY * (event.ctrlKey ? -0.005 : 0); // Adjust sensitivity
        })
        .on("zoom", (event) => {
          d3.select(gRef.current).attr("transform", event.transform);
          setTransformState(event.transform);
        });

      svg.call(zoomRef.current);

      // Restore previous zoom state if available
      if (transformState) {
        svg.call(zoomRef.current.transform, transformState);
      }
      // Disable drag events (prevents grabbing and dragging the tree)
      svg.on("mousedown.zoom", null).on("touchstart.zoom", null);

      // Enable only vertical scrolling (pan)
      svg.on("wheel", (event) => {
        event.preventDefault();
        const transform = d3.zoomTransform(svg.node() as SVGSVGElement);
        const dy = event.deltaY * 0.5; // Adjust scroll speed
        svg.call(
          zoomRef.current!.transform,
          d3.zoomIdentity
            .translate(initialX, transform.y - dy)
            .scale(transform.k)
        );
      });
    }

    // ✅ Store the initial transform **only once** using useRef
    if (!initialTransformState.current) {
      initialTransformState.current = d3.zoomIdentity
        .translate(initialX, initialY)
        .scale(1);
    }

    // Restore previous zoom state if available, otherwise set to initial state
    const transform = transformState || initialTransformState.current;
    svg.call(zoomRef.current.transform, transform);

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

    const nodes = g
      .selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.y},${d.x})`)
      .on("click", (_, d) => toggleNode(d.data, d.parent?.data)); // Pass parent node

    nodes
      .append("circle")
      .attr("r", 8)
      .attr("fill", (d) => (d.data.expanded ? "#69b3a2" : "#ff7f0e"))
      .attr("stroke", "#000");

    nodes
      .append("text")
      .attr("dx", 12)
      .attr("dy", 5)
      .text((d) => d.data.name)
      .attr("font-size", "12px");
  }, [treeData]); // Runs only when treeData changes

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

  const defaultView = () => {
    if (!svgRef.current || !zoomRef.current || !initialTransformState) return;
    resetZoom();
    // ✅ Reset the tree data to its initial state
    setTreeData(transformDataToTree(jsonData));

    // ✅ Reset zoom and pan to original position
    d3.select(svgRef.current)
      .transition()
      .duration(750)
      .call(zoomRef.current.transform, initialTransformState);
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
          <button onClick={defaultView}>Reset</button>
        </div>
      </div>
    </div>
  );
};

export default TreeDiagram;
