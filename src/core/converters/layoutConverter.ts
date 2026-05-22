/**
 * Converts Figma Auto Layout and Grid properties to precise raw CSS.
 * Handles Flexbox for standard Auto Layout and Grid for wrapped or grid-based layouts.
 */
export function figmaToCSS(node: any): string {
  const styles: string[] = [];

  // 1. Layout Mode & Display
  if (node.layoutMode === "HORIZONTAL" || node.layoutMode === "VERTICAL") {
    if (node.layoutWrap === "WRAP") {
      // Use CSS Grid for Wrap layouts as requested (or Flex with wrap, 
      // but instructions specifically asked for Grid with auto-fill for wrapping)
      styles.push("display: grid;");
      const gap = node.itemSpacing || 0;
      const counterGap = node.counterAxisSpacing ?? gap;
      styles.push(`gap: ${gap}px ${counterGap}px;`);
      
      // For auto-fill behavior, we need a base width. If children have fixed widths, we use that.
      // Since we don't know child widths here, we'll assume a standard flex-wrap approach 
      // or grid-template-columns if specific grid props exist.
      if (node.layoutMode === "HORIZONTAL") {
         styles.push(`grid-template-columns: repeat(auto-fill, minmax(${node.itemSpacing || 0}px, 1fr));`);
      }
    } else {
      styles.push("display: flex;");
      styles.push(`flex-direction: ${node.layoutMode === "HORIZONTAL" ? "row" : "column"};`);
      styles.push(`gap: ${node.itemSpacing || 0}px;`);
    }

    // 2. Alignment (Figma to Flexbox/Grid mapping)
    const primaryAlignMap: any = {
      MIN: "flex-start",
      CENTER: "center",
      MAX: "flex-end",
      SPACE_BETWEEN: "space-between",
    };
    const counterAlignMap: any = {
      MIN: "flex-start",
      CENTER: "center",
      MAX: "flex-end",
      BASELINE: "baseline",
    };

    styles.push(`justify-content: ${primaryAlignMap[node.primaryAxisAlignItems] || "flex-start"};`);
    styles.push(`align-items: ${counterAlignMap[node.counterAxisAlignItems] || "flex-start"};`);
  }

  // 3. Explicit Layout Grids
  if (node.layoutGrids && node.layoutGrids.length > 0) {
    styles.push("display: grid;");
    node.layoutGrids.forEach((grid: any) => {
      if (grid.pattern === "COLUMNS") {
        const columns = grid.count || "auto-fill";
        const gutter = grid.gutterSize || 0;
        const margin = grid.margin || 0;
        styles.push(`grid-template-columns: repeat(${columns}, 1fr);`);
        styles.push(`column-gap: ${gutter}px;`);
        styles.push(`padding-left: ${margin}px;`);
        styles.push(`padding-right: ${margin}px;`);
      } else if (grid.pattern === "ROWS") {
        const rows = grid.count || "auto-fill";
        const gutter = grid.gutterSize || 0;
        const margin = grid.margin || 0;
        styles.push(`grid-template-rows: repeat(${rows}, 1fr);`);
        styles.push(`row-gap: ${gutter}px;`);
        styles.push(`padding-top: ${margin}px;`);
        styles.push(`padding-bottom: ${margin}px;`);
      } else if (grid.pattern === "GRID") {
        styles.push(`background-image: radial-gradient(circle, #000 1px, transparent 1px);`);
        styles.push(`background-size: ${grid.sectionSize}px ${grid.sectionSize}px;`);
      }
    });
  }

  // 4. Sizing (Width/Height)
  if (node.width) styles.push(`width: ${node.width}px;`);
  if (node.height) styles.push(`height: ${node.height}px;`);
  if (node.minWidth) styles.push(`min-width: ${node.minWidth}px;`);
  if (node.maxWidth) styles.push(`max-width: ${node.maxWidth}px;`);
  if (node.minHeight) styles.push(`min-height: ${node.minHeight}px;`);
  if (node.maxHeight) styles.push(`max-height: ${node.maxHeight}px;`);

  // 5. Padding
  const pt = node.paddingTop || 0;
  const pr = node.paddingRight || 0;
  const pb = node.paddingBottom || 0;
  const pl = node.paddingLeft || 0;
  if (pt === pr && pr === pb && pb === pl && pt !== 0) {
    styles.push(`padding: ${pt}px;`);
  } else if (pt !== 0 || pr !== 0 || pb !== 0 || pl !== 0) {
    styles.push(`padding: ${pt}px ${pr}px ${pb}px ${pl}px;`);
  }

  // 6. Corner Radius
  if (node.cornerRadius && node.cornerRadius !== "mixed") {
    styles.push(`border-radius: ${node.cornerRadius}px;`);
  } else {
    if (node.topLeftRadius) styles.push(`border-top-left-radius: ${node.topLeftRadius}px;`);
    if (node.topRightRadius) styles.push(`border-top-right-radius: ${node.topRightRadius}px;`);
    if (node.bottomLeftRadius) styles.push(`border-bottom-left-radius: ${node.bottomLeftRadius}px;`);
    if (node.bottomRightRadius) styles.push(`border-bottom-right-radius: ${node.bottomRightRadius}px;`);
  }

  return styles.join("\n");
}

// Example Usage & Verification Logic
/*
const mockNode = {
  layoutMode: "HORIZONTAL",
  primaryAxisAlignItems: "CENTER",
  counterAxisAlignItems: "MIN",
  itemSpacing: 10,
  paddingLeft: 20,
  paddingRight: 20,
  paddingTop: 10,
  paddingBottom: 10,
  width: 500,
  cornerRadius: 8
};
console.log(figmaToCSS(mockNode));
*/
