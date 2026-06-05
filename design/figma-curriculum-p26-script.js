/**
 * Figma Plugin API script — paste into use_figma when MCP quota is available.
 * fileKey: QLH5Sj8JwDUr6xB1zxm41Q
 * skillNames: figma-use,figma-generate-design
 *
 * Creates Frame "Curriculum · 通识基础模块 (P26)" — brochure page 26 layout, no images.
 */

const PEACH = { r: 0.949, g: 0.769, b: 0.682 };
const BLACK = { r: 0, g: 0, b: 0 };
const WHITE = { r: 1, g: 1, b: 1 };

await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' });

const BLOCKS = [
  { module: 'Design Foundation 1', hoursMode: 'section', hours: '10H', topics: [
    'Defining Game 定义游戏', 'Game Structure 游戏结构', 'Board Game 桌上游戏',
    'Digital Game 数字游戏', 'Conceptualization & Prototyping 概念与原型'] },
  { module: 'Design Foundation 2', hoursMode: 'section', hours: '10H', topics: [
    'Rules & Mechanics 规则与机制', 'Interface & User experience 界面与用户体验',
    'Level Design 关卡设计', 'World, Story & Character 世界, 故事与角色',
    'Document & Proposal 游戏设计文档'] },
  { module: 'Design Foundation 3', hoursMode: 'row', hours: '10H', topics: [
    'Practice: 桌游改造', 'Practice: 关卡概念', 'Practice: UI 设计',
    'Practice: 3D道具设计', 'Practice: 像素游戏美术'] },
  { module: 'Design Foundation 4', hoursMode: 'row', hours: '10H', topics: [
    'Miniproject: GDD', 'Miniproject: 关卡实现', 'Miniproject: 桌游设计',
    'Miniproject: 3D环境美术', 'Miniproject: 游戏开发入门'] },
  { module: 'AI课程', hoursMode: 'row', hours: '10H', topics: [' '] },
  { module: '软件课程 LEVEL 1', hoursMode: 'row', hours: '20H', topics: [
    '数字绘画', '3D建模', '数字雕刻', '灯光渲染'] },
  { module: '软件课程 LEVEL 2', hoursMode: 'row', hours: '20H', topics: [
    '2D动画合成', 'PBR全流程掌握', '电脑动画'] },
  { module: '软件课程 LEVEL 3', hoursMode: 'row', hours: '20H', topics: [
    '虚幻引擎入门', 'Unity游戏开发基础', 'AIGC', 'TA游戏特效'] },
];

let maxX = 0;
for (const child of figma.currentPage.children) {
  maxX = Math.max(maxX, child.x + child.width);
}

const wrapper = figma.createFrame();
wrapper.name = 'Curriculum · 通识基础模块 (P26)';
wrapper.resize(1200, 100);
wrapper.layoutMode = 'HORIZONTAL';
wrapper.primaryAxisSizingMode = 'AUTO';
wrapper.counterAxisSizingMode = 'AUTO';
wrapper.itemSpacing = 0;
wrapper.fills = [];
wrapper.x = maxX + 200;
wrapper.y = 0;

const sidebar = figma.createFrame();
sidebar.name = 'Sidebar';
sidebar.resize(72, 100);
sidebar.layoutMode = 'VERTICAL';
sidebar.primaryAxisAlignItems = 'CENTER';
sidebar.counterAxisAlignItems = 'CENTER';
sidebar.layoutGrow = 0;
sidebar.fills = [{ type: 'SOLID', color: BLACK }];
const sideText = figma.createText();
sideText.fontName = { family: 'Inter', style: 'Semi Bold' };
sideText.characters = '通识基础模块';
sideText.fontSize = 16;
sideText.fills = [{ type: 'SOLID', color: WHITE }];
sideText.textAlignVertical = 'CENTER';
sidebar.appendChild(sideText);
wrapper.appendChild(sidebar);

const body = figma.createFrame();
body.name = 'Body';
body.layoutMode = 'VERTICAL';
body.itemSpacing = 0;
body.fills = [{ type: 'SOLID', color: PEACH }];
body.layoutGrow = 1;
body.layoutSizingHorizontal = 'FILL';
wrapper.appendChild(body);

const createdNodeIds = [wrapper.id, sidebar.id, body.id];

function addDivider(frame) {
  const line = figma.createRectangle();
  line.name = 'Divider';
  line.resize(100, 1);
  line.fills = [{ type: 'SOLID', color: BLACK }];
  line.layoutSizingHorizontal = 'FILL';
  frame.appendChild(line);
  createdNodeIds.push(line.id);
}

function makeText(str, bold) {
  const t = figma.createText();
  t.fontName = { family: 'Inter', style: bold ? 'Semi Bold' : 'Regular' };
  t.characters = str;
  t.fontSize = bold ? 15 : 14;
  t.fills = [{ type: 'SOLID', color: BLACK }];
  createdNodeIds.push(t.id);
  return t;
}

for (const block of BLOCKS) {
  const section = figma.createFrame();
  section.name = block.module;
  section.layoutMode = 'HORIZONTAL';
  section.itemSpacing = 0;
  section.layoutSizingHorizontal = 'FILL';
  section.fills = [{ type: 'SOLID', color: PEACH }];
  section.strokes = [{ type: 'SOLID', color: BLACK }];
  section.strokeWeight = 1;
  section.strokeAlign = 'INSIDE';
  section.strokeBottomWeight = 1;

  const modCol = figma.createFrame();
  modCol.resize(220, 44);
  modCol.layoutMode = 'VERTICAL';
  modCol.primaryAxisAlignItems = 'CENTER';
  modCol.counterAxisAlignItems = 'CENTER';
  modCol.layoutSizingVertical = 'FILL';
  modCol.fills = [];
  modCol.strokes = [{ type: 'SOLID', color: BLACK }];
  modCol.strokeRightWeight = 1;
  modCol.appendChild(makeText(block.module, true));
  section.appendChild(modCol);
  createdNodeIds.push(section.id, modCol.id);

  const topicsCol = figma.createFrame();
  topicsCol.layoutMode = 'VERTICAL';
  topicsCol.itemSpacing = 0;
  topicsCol.layoutGrow = 1;
  topicsCol.layoutSizingHorizontal = 'FILL';
  topicsCol.fills = [];

  for (const topic of block.topics) {
    const row = figma.createFrame();
    row.layoutMode = 'HORIZONTAL';
    row.layoutSizingHorizontal = 'FILL';
    row.minHeight = 44;
    row.fills = [];
    row.strokes = [{ type: 'SOLID', color: BLACK }];
    row.strokeBottomWeight = 1;

    const topicCell = figma.createFrame();
    topicCell.layoutGrow = 1;
    topicCell.layoutMode = 'HORIZONTAL';
    topicCell.primaryAxisAlignItems = 'CENTER';
    topicCell.paddingLeft = 16;
    topicCell.paddingRight = 16;
    topicCell.fills = [];
    topicCell.appendChild(makeText(topic, false));
    row.appendChild(topicCell);

    if (block.hoursMode === 'row') {
      const hCell = figma.createFrame();
      hCell.resize(64, 44);
      hCell.layoutMode = 'VERTICAL';
      hCell.primaryAxisAlignItems = 'CENTER';
      hCell.counterAxisAlignItems = 'CENTER';
      hCell.strokes = [{ type: 'SOLID', color: BLACK }];
      hCell.strokeLeftWeight = 1;
      hCell.fills = [];
      hCell.appendChild(makeText(block.hours, true));
      row.appendChild(hCell);
      createdNodeIds.push(row.id, topicCell.id, hCell.id);
    } else {
      createdNodeIds.push(row.id, topicCell.id);
    }
    topicsCol.appendChild(row);
  }
  section.appendChild(topicsCol);
  createdNodeIds.push(topicsCol.id);

  if (block.hoursMode === 'section') {
    const hCol = figma.createFrame();
    hCol.resize(64, 44);
    hCol.layoutMode = 'VERTICAL';
    hCol.primaryAxisAlignItems = 'CENTER';
    hCol.counterAxisAlignItems = 'CENTER';
    hCol.layoutSizingVertical = 'FILL';
    hCol.strokes = [{ type: 'SOLID', color: BLACK }];
    hCol.strokeLeftWeight = 1;
    hCol.fills = [];
    hCol.appendChild(makeText(block.hours, true));
    section.appendChild(hCol);
    createdNodeIds.push(hCol.id);
  }

  body.appendChild(section);
}

wrapper.layoutSizingHorizontal = 'HUG';
wrapper.layoutSizingVertical = 'HUG';

return { success: true, wrapperId: wrapper.id, createdNodeIds };
