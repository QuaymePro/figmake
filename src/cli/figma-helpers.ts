import axios from 'axios';

export function extractFileKey(url: string): string | null {
  const match = url.match(/\/(?:file|design|board)\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

export async function fetchFigmaFile(fileKey: string, token: string) {
  const response = await axios.get(`https://api.figma.com/v1/files/${fileKey}`, {
    headers: { 'X-Figma-Token': token },
  });
  return response.data;
}

export function buildNodeMap(root: any) {
  const map = new Map<string, any>();
  const traverse = (node: any) => {
    map.set(node.id, node);
    if (node.children) node.children.forEach(traverse);
  };
  traverse(root);
  return map;
}
