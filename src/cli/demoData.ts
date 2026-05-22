export const MOCK_FIGMA_FILE = {
  name: "Demo Project",
  document: {
    id: "0:0",
    name: "Document",
    type: "DOCUMENT",
    children: [
      {
        id: "0:1",
        name: "Page 1",
        type: "PAGE",
        children: [
          {
            id: "1:1",
            name: "Button",
            type: "FRAME",
            layoutMode: "HORIZONTAL",
            itemSpacing: 10,
            paddingTop: 12,
            paddingRight: 24,
            paddingBottom: 12,
            paddingLeft: 24,
            fills: [{ type: "SOLID", color: { r: 0.1, g: 0.5, b: 0.9, a: 1 } }],
            cornerRadius: 8,
            children: [
              {
                id: "1:2",
                name: "Label",
                type: "TEXT",
                characters: "Demo Button",
                fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 } }],
                style: {
                  fontSize: 16,
                  fontWeight: 600,
                  fontFamily: "Inter"
                }
              }
            ]
          },
          {
            id: "2:1",
            name: "Card",
            type: "FRAME",
            layoutMode: "VERTICAL",
            itemSpacing: 16,
            paddingTop: 24,
            paddingRight: 24,
            paddingBottom: 24,
            paddingLeft: 24,
            fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 } }],
            cornerRadius: 12,
            effects: [{ type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 4 }, radius: 10 }],
            children: [
              {
                id: "2:2",
                name: "Card Title",
                type: "TEXT",
                characters: "Demo Card",
                fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 0, a: 1 } }],
                style: {
                  fontSize: 20,
                  fontWeight: 700,
                  fontFamily: "Inter"
                }
              },
              {
                id: "2:3",
                name: "Description",
                type: "TEXT",
                characters: "This is a demo card generated without a Figma token.",
                fills: [{ type: "SOLID", color: { r: 0.4, g: 0.4, b: 0.4, a: 1 } }],
                style: {
                  fontSize: 14,
                  fontWeight: 400,
                  fontFamily: "Inter"
                }
              }
            ]
          }
        ]
      }
    ]
  }
};
