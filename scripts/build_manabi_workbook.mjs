/** Build the Manabi team workbook from planning metadata and authoritative tasks.
 * Usage: bundled-node scripts/build_manabi_workbook.mjs [--repo PATH]
 *        [--runtime-modules PATH] [--output PATH] [--qa-dir PATH] [--skip-render]
 * Requires the bundled @oai/artifact-tool; no repository dependencies.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const repo = path.resolve(option('--repo', path.join(path.dirname(fileURLToPath(import.meta.url)), '..')));
try {
  await fs.access(path.join(repo, 'tasks/project-tasks.json'));
} catch {
  throw new Error('Chua co registry/task trien khai; dung python scripts/validate_repository.py de kiem tra ke hoach.');
}
const runtimeModules = option('--runtime-modules', process.env.MANABI_ARTIFACT_NODE_MODULES
  || path.join(path.dirname(process.execPath), '..', 'node_modules'));
const runtimeRequire = createRequire(path.join(path.resolve(runtimeModules), '..', 'manabi-artifact-loader.cjs'));
const { Workbook, SpreadsheetFile, FileBlob } = await import(pathToFileURL(runtimeRequire.resolve('@oai/artifact-tool')).href);
const outputPath = path.resolve(option('--output', path.join(repo, 'docs/project/Phan_cong_du_an_Manabi.xlsx')));
const qaDir = path.resolve(option('--qa-dir', path.join(repo, '.work/manabi/workbook-qa')));
await fs.mkdir(qaDir, { recursive: true });
await fs.mkdir(path.dirname(outputPath), { recursive: true });

const registryRelativePath = 'tasks/project-tasks.json';
const registryText = await fs.readFile(path.join(repo, registryRelativePath), 'utf8');
const registry = JSON.parse(registryText);
if (registry.project !== 'Manabi' || registry.tasks.length !== 36 || registry.members.length !== 6) {
  throw new Error('Expected Manabi registry with 36 future tasks and six members. Review builder before changing scope.');
}
const taskMap = new Map();
for (const folder of ['backlog', 'in-progress', 'review', 'done']) {
  for (const filename of await fs.readdir(path.join(repo, 'tasks', folder))) {
    if (!filename.endsWith('.md')) continue;
    const relative = `tasks/${folder}/${filename}`;
    const text = await fs.readFile(path.join(repo, relative), 'utf8');
    const match = text.match(/^#\s+(MANABI-\d+)\b/m);
    if (!match) continue;
    if (taskMap.has(match[1])) throw new Error(`Duplicate authoritative task ID ${match[1]}`);
    taskMap.set(match[1], { text, file: relative, folder });
  }
}
const section = (text, title) => {
  const start = text.indexOf(`## ${title}`);
  if (start < 0) return '';
  const body = text.slice(start + title.length + 4);
  const end = body.search(/^## /m);
  return (end < 0 ? body : body.slice(0, end)).trim();
};
const tasks = registry.tasks.map((task) => {
  const source = taskMap.get(task.id);
  if (!source) throw new Error(`Missing authoritative Markdown for ${task.id}`);
  const status = source.text.match(/^- Trạng thái:\s*(\S+)/m)?.[1];
  if (!['backlog', 'in-progress', 'review', 'done', 'blocked'].includes(status)) {
    throw new Error(`Invalid/missing status in ${source.file}`);
  }
  if (status !== 'blocked' && status !== source.folder) {
    throw new Error(`Status/folder mismatch for ${task.id}: ${status}/${source.folder}`);
  }
  const owner = source.text.match(/^- Owner:\s*(.+)$/m)?.[1]?.trim();
  const reviewer = source.text.match(/^- Reviewer:\s*(.+)$/m)?.[1]?.trim();
  if (owner !== task.owner || reviewer !== task.reviewer) throw new Error(`Owner/reviewer planning mismatch in ${task.id}`);
  const ac = section(source.text, 'Acceptance criteria').split(/\r?\n/)
    .filter((line) => /^- \[[ xX]\]/.test(line))
    .map((line) => line.replace(/^- \[([ xX])\]\s*/, (_, checked) => checked.toLowerCase() === 'x' ? 'Đã kiểm: ' : 'Chưa kiểm: '));
  if (!ac.length) throw new Error(`Missing acceptance criteria in ${task.id}`);
  return { ...task, status, file: source.file, ac };
});
// The 36 task sources are shared with the repository freshness checker.
const workbookSources = new Map([[registryRelativePath, registryText],
  ...tasks.map((task) => [task.file, taskMap.get(task.id).text])]);
const fingerprint = (sources) => {
  const digest = crypto.createHash('sha256');
  for (const relative of [...sources.keys()].sort()) {
    digest.update(relative).update('\0').update(sources.get(relative).replace(/\r\n/g, '\n')).update('\0');
  }
  return digest.digest('hex');
};
const sourceFingerprint = fingerprint(workbookSources);
const teamMarkdown = await fs.readFile(path.join(repo, 'docs/project/TEAM_AND_RESPONSIBILITIES.md'), 'utf8');
const roles = new Map();
for (const line of teamMarkdown.split(/\r?\n/)) {
  if (!line.startsWith('|')) continue;
  const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
  if (registry.members.some((member) => member.name === cells[0]) && cells.length === 4) roles.set(cells[0], cells[3]);
}
const planMarkdown = await fs.readFile(path.join(repo, 'docs/project/PROJECT_PLAN.md'), 'utf8');
const gates = new Map();
for (const line of planMarkdown.split(/\r?\n/)) {
  const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
  const gate = cells[0]?.match(/^G([1-6])\b/);
  if (gate && cells.length === 3) gates.set(Number(gate[1]), `${cells[1]}. ${cells[2]}`);
}
for (const member of registry.members) {
  if (!roles.has(member.name)) throw new Error(`Missing role for ${member.name}`);

}

const wb = Workbook.create();
const summary = wb.worksheets.add('Tổng hợp');
const roadmap = wb.worksheets.add('Lộ trình');
const detail = wb.worksheets.add('Tasks');
const ink = '#242035';
const brand = '#514278';
const light = '#F4F1F8';
const firstRow = 5;
const lastRow = firstRow + tasks.length - 1;
const rowRange = (col) => `'Tasks'!$${col}$${firstRow}:$${col}$${lastRow}`;
const styleSheet = (sheet, lastCol, lastRowUsed) => {
  sheet.showGridLines = false;
  sheet.getRange(`A1:${lastCol}${lastRowUsed}`).format.font = { name: 'Arial', size: 11, color: ink };
  sheet.getRange(`A1:${lastCol}${lastRowUsed}`).format.verticalAlignment = 'center';
  sheet.getRange('A2').format.font = { name: 'Arial', size: 16, bold: true, color: brand };
  sheet.getRange(`A3:${lastCol}3`).format.rowHeight = 28;
};
const styleHeader = (sheet, range) => {
  sheet.getRange(range).format = {
    fill: brand,
    font: { name: 'Arial', size: 11, bold: true, color: '#FFFFFF' },
    horizontalAlignment: 'center', verticalAlignment: 'center', wrapText: true,
    borders: { insideVertical: { style: 'thin', color: '#FFFFFF' } },
  };
};
const setWidths = (sheet, widths) => Object.entries(widths).forEach(([column, width]) => {
  sheet.getRange(`${column}1:${column}${sheet === detail ? lastRow : 18}`).format.columnWidthPx = width;
});

styleSheet(detail, 'K', lastRow);
detail.getRange('A2').values = [['Manabi. Phân công 36 task']];
detail.getRange('A3').values = [['Nguồn: registry kế hoạch và task Markdown hiện hành. Cập nhật task rồi tạo lại workbook; không sửa trạng thái trong file này.']];
detail.getRange('A4:K4').values = [[
  'Task ID', 'Công việc', 'Owner', 'Reviewer', 'Phase', 'Điểm làm', 'Điểm review', 'Trạng thái', 'Dependency', 'Acceptance criteria', 'Nguồn task',
]];
detail.getRange(`A${firstRow}:K${lastRow}`).values = tasks.map((task) => [
  task.id, task.title, task.owner, task.reviewer, task.phase, task.points, task.reviewPoints, task.status,
  [task.deps.join(', '), ...task.conditionalDeps.map((dep) => `${dep.when}: ${dep.ids.join(', ')}`)].filter(Boolean).join('\n'),
  task.ac.join('\n'), task.file,
]);
setWidths(detail, { A: 118, B: 300, C: 78, D: 78, E: 64, F: 72, G: 80, H: 104, I: 330, J: 630, K: 400 });
detail.getRange('A4:K4').format.rowHeight = 42;
styleHeader(detail, 'A4:K4');
detail.getRange(`A${firstRow}:K${lastRow}`).format.wrapText = true;
detail.getRange(`A${firstRow}:K${lastRow}`).format.verticalAlignment = 'top';
detail.getRange(`C${firstRow}:D${lastRow}`).format.horizontalAlignment = 'center';
detail.getRange(`H${firstRow}:H${lastRow}`).format.horizontalAlignment = 'center';
detail.getRange(`E${firstRow}:G${lastRow}`).setNumberFormat('0');
detail.getRange(`E${firstRow}:G${lastRow}`).format.horizontalAlignment = 'right';
for (let index = 0; index < tasks.length; index++) {
  const row = firstRow + index;
  const task = tasks[index];
  const lineCount = task.ac.reduce((sum, item) => sum + Math.max(1, Math.ceil(item.length / 85)), 0);
  detail.getRange(`A${row}:K${row}`).format.rowHeightPx = Math.max(98, lineCount * 17 + 16);
  if (index % 2 === 1) detail.getRange(`A${row}:K${row}`).format.fill = light;
}
for (const [status, fill, color] of [
  ['in-progress', '#FFF2D8', '#805600'], ['review', '#E9E2F6', brand],
  ['done', '#E3F2E8', '#245D3B'], ['blocked', '#FBE7E7', '#922F2F'],
]) detail.getRange(`H${firstRow}:H${lastRow}`).conditionalFormats.add('containsText', { text: status, format: { fill, font: { color, bold: true } } });
detail.freezePanes.freezeRows(4);
detail.freezePanes.freezeColumns(2);

styleSheet(summary, 'L', 18);
summary.tabColor = brand;
summary.getRange('A2').values = [['Manabi. Tải công việc sáu thành viên']];
summary.getRange('K2').values = [['Kế hoạch']];
summary.getRange('L2').values = [[new Date(`${registry.updatedAt}T00:00:00Z`)]];
summary.getRange('L2').setNumberFormat('dd/mm/yyyy');
summary.getRange('A3').values = [['Ước lượng tương đối. Trạng thái hiện hành lấy từ task Markdown, không từ registry kế hoạch.']];
summary.getRange('A5:L5').values = [[
  'Thành viên', 'Vai trò', 'Task làm', 'Điểm làm', 'Task review', 'Điểm review', 'Tổng điểm', 'Backlog', 'Đang làm', 'Chờ review', 'Done', 'Blocked',
]];
styleHeader(summary, 'A5:L5');
summary.getRange('A5:L5').format.rowHeight = 42;
summary.getRange('A6:B11').values = registry.members.map((member) => [member.name, roles.get(member.name)]);
summary.getRange('C6:L6').formulas = [[
  `=COUNTIFS(${rowRange('C')},$A6)`, `=SUMIFS(${rowRange('F')},${rowRange('C')},$A6)`,
  `=COUNTIFS(${rowRange('D')},$A6)`, `=SUMIFS(${rowRange('G')},${rowRange('D')},$A6)`, '=SUM(D6,F6)',
  ...['backlog', 'in-progress', 'review', 'done', 'blocked'].map((status) => `=COUNTIFS(${rowRange('C')},$A6,${rowRange('H')},"${status}")`),
]];
summary.getRange('C6:L11').fillDown();
summary.getRange('A12').values = [['Toàn nhóm']];
summary.getRange('C12:L12').formulas = [Array.from({ length: 10 }, (_, index) => `=SUM(${String.fromCharCode(67 + index)}6:${String.fromCharCode(67 + index)}11)`)];
summary.getRange('A6:L12').format.rowHeight = 30;
summary.getRange('C6:L12').setNumberFormat('0');
summary.getRange('C6:L12').format.horizontalAlignment = 'right';
summary.getRange('A12:L12').format.font = { name: 'Arial', size: 11, bold: true, color: ink };
summary.getRange('A12:L12').format.borders = { top: { style: 'thin', color: brand } };
summary.getRange('A15').values = [['Tải gồm triển khai, hỗ trợ và review; điểm lấy từ task đã chốt, không phải số giờ.']];
summary.getRange('A16').values = [['Danh mục triển khai gồm MANABI-001 đến MANABI-036. Reviewer khác owner xác nhận trước Done.']];
summary.getRange('A17').values = [['Nguồn trạng thái là task Markdown. Báo cáo DOCX trước push giúp trưởng nhóm xem đã làm, còn lại, lỗi và quyết định merge.']];
setWidths(summary, { A: 112, B: 220, C: 76, D: 78, E: 90, F: 94, G: 84, H: 76, I: 84, J: 94, K: 64, L: 90 });

const phaseLast = 4 + registry.phases.length;
const phaseTotal = phaseLast + 1;
styleSheet(roadmap, 'F', phaseTotal + 5);
roadmap.getRange('A2').values = [['Manabi. Lộ trình theo dependency']];
roadmap.getRange('A3').values = [['Chưa chốt ngày sprint. Phase không thay thế dependency/review gate; AI và ảnh không chặn core offline.']];
roadmap.getRange('A4:F4').values = [['Phase', 'Trọng tâm', 'Số task', 'Điểm làm', 'Done', 'Cổng nghiệm thu']];
styleHeader(roadmap, 'A4:F4');
roadmap.getRange('A4:F4').format.rowHeight = 42;
roadmap.getRange(`A5:B${phaseLast}`).values = registry.phases.map((phase) => [phase.id, phase.name]);
roadmap.getRange('C5:E5').formulas = [[
  `=COUNTIFS(${rowRange('E')},$A5)`,
  `=SUMIFS(${rowRange('F')},${rowRange('E')},$A5)`,
  `=COUNTIFS(${rowRange('E')},$A5,${rowRange('H')},"done")`,
]];
roadmap.getRange(`C5:E${phaseLast}`).fillDown();
roadmap.getRange(`F5:F${phaseLast}`).values = registry.phases.map((phase) => {
  const gate = phase.acceptance || gates.get(Number(String(phase.gate ?? phase.id).replace(/^G/, '')));
  if (!gate) throw new Error(`Missing roadmap gate G${phase.id}`);
  return [gate];
});
roadmap.getRange(`A5:F${phaseLast}`).format.rowHeightPx = 78;
roadmap.getRange(`B5:B${phaseLast}`).format.wrapText = true;
roadmap.getRange(`F5:F${phaseLast}`).format.wrapText = true;
roadmap.getRange(`A${phaseTotal}`).values = [['Tổng']];
roadmap.getRange(`C${phaseTotal}:E${phaseTotal}`).formulas = [[`=SUM(C5:C${phaseLast})`, `=SUM(D5:D${phaseLast})`, `=SUM(E5:E${phaseLast})`]];
roadmap.getRange(`A${phaseTotal}:F${phaseTotal}`).format.font = { name: 'Arial', size: 11, bold: true, color: ink };
roadmap.getRange(`A${phaseTotal}:F${phaseTotal}`).format.borders = { top: { style: 'thin', color: brand } };
roadmap.getRange(`C5:E${phaseTotal}`).setNumberFormat('0');
roadmap.getRange(`C5:E${phaseTotal}`).format.horizontalAlignment = 'right';
roadmap.getRange(`A${phaseTotal + 3}`).values = [['G0: reviewer xác nhận phạm vi trước khi mở task triển khai. Phạm vi/dependency là kế hoạch chưa triển khai.']];
roadmap.getRange(`A${phaseTotal + 4}`).values = [['Gate semantic cần assessor tiếng Nhật độc lập; chưa có assessor hoặc điều khoản phù hợp thì giữ AI/ảnh tắt.']];
setWidths(roadmap, { A: 72, B: 310, C: 78, D: 84, E: 70, F: 650 });

wb.recalculate();
const base = summary.getRange('C6:L11').values;
for (const [index, member] of registry.members.entries()) {
  const expectedStatus = ['backlog', 'in-progress', 'review', 'done', 'blocked']
    .map((status) => tasks.filter((task) => task.owner === member.name && task.status === status).length);
  const owned = tasks.filter((task) => task.owner === member.name);
  const reviewed = tasks.filter((task) => task.reviewer === member.name);
  const ownerPoints = owned.reduce((sum, task) => sum + task.points, 0);
  const reviewPoints = reviewed.reduce((sum, task) => sum + task.reviewPoints, 0);
  const expected = [owned.length, ownerPoints, reviewed.length, reviewPoints, ownerPoints + reviewPoints, ...expectedStatus];
  if (JSON.stringify(base[index]) !== JSON.stringify(expected)) throw new Error(`Formula values mismatch for ${member.name}: ${JSON.stringify(base[index])}`);
}
if (JSON.stringify(roadmap.getRange(`C${phaseTotal}:E${phaseTotal}`).values[0]) !== JSON.stringify([tasks.length, tasks.reduce((sum, task) => sum + task.points, 0), tasks.filter((task) => task.status === 'done').length])) {
  throw new Error('Roadmap totals mismatch independent source counts.');
}
// Recalculation proof: temporarily complete one task; its owner/phase counts react.
const oldStatus = detail.getRange('H5').values[0][0];
const ownerIndex = registry.members.findIndex((member) => member.name === tasks[0].owner);
const ownerSummaryRow = 6 + ownerIndex;
const originalDone = summary.getRange(`K${ownerSummaryRow}`).values[0][0];
const originalPhaseDone = roadmap.getRange(`E${5 + registry.phases.findIndex((phase) => phase.id === tasks[0].phase)}`).values[0][0];
detail.getRange('H5').values = [[oldStatus === 'done' ? 'backlog' : 'done']];
wb.recalculate();
const delta = oldStatus === 'done' ? -1 : 1;
if (summary.getRange(`K${ownerSummaryRow}`).values[0][0] !== originalDone + delta
  || roadmap.getRange(`E${5 + registry.phases.findIndex((phase) => phase.id === tasks[0].phase)}`).values[0][0] !== originalPhaseDone + delta) {
  throw new Error('Input mutation did not recalculate summary and roadmap.');
}
detail.getRange('H5').values = [[oldStatus]];
wb.recalculate();
if (JSON.stringify(summary.getRange('C6:L11').values) !== JSON.stringify(base)) throw new Error('Temporary input mutation did not restore cleanly.');
const inspect = await wb.inspect({ kind: 'table', range: "'Tổng hợp'!A5:L12", include: 'values,formulas', tableMaxRows: 8, tableMaxCols: 12, maxChars: 10000 });
await fs.writeFile(path.join(qaDir, 'workbook-summary-inspect.ndjson'), inspect.ndjson);
const errors = await wb.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!', options: { useRegex: true, maxResults: 100 }, maxChars: 5000, summary: 'Formula error scan' });
await fs.writeFile(path.join(qaDir, 'workbook-errors.ndjson'), errors.ndjson);
if (/"value":"#(?:REF!|DIV\/0!|VALUE!|NAME\?|N\/A|NUM!|NULL!|SPILL!|CALC!)/.test(errors.ndjson)) throw new Error('Formula error found.');
if (!args.includes('--skip-render')) {
  const render = async (sheetName, range, filename) => {
    const blob = await wb.render({ sheetName, range, scale: 1.5, format: 'png' });
    await fs.writeFile(path.join(qaDir, filename), new Uint8Array(await blob.arrayBuffer()));
  };
  await render('Tổng hợp', 'A1:L18', 'workbook-summary.png');
  await render('Lộ trình', `A1:F${phaseTotal + 5}`, 'workbook-roadmap.png');
  await render('Tasks', 'A1:I4', 'workbook-tasks-header-core.png');
  await render('Tasks', 'J4:K4', 'workbook-tasks-header-criteria.png');
  for (let start = firstRow; start <= lastRow; start += 6) {
    const end = Math.min(start + 5, lastRow);
    await render('Tasks', `A${start}:I${end}`, `workbook-tasks-${start}-${end}-core.png`);
    await render('Tasks', `J${start}:K${end}`, `workbook-tasks-${start}-${end}-criteria.png`);
  }
}
const xlsx = await SpreadsheetFile.exportXlsx(wb);
await xlsx.save(outputPath);
const reopened = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
// The public importer writes a diagnostic beside XLSX; retain it in QA, not docs.
const importDiagnostic = `${outputPath}.inspect.ndjson`;
try {
  await fs.rename(importDiagnostic, path.join(qaDir, 'workbook-export-import-inspect.ndjson'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
reopened.recalculate();
const reopenedSummary = reopened.worksheets.getItem('Tổng hợp').getRange('C6:L11').values;
if (JSON.stringify(reopenedSummary) !== JSON.stringify(base)) throw new Error('Saved/reopened workbook summary differs.');
const reopenedTaskRows = reopened.worksheets.getItem('Tasks').getRange(`A${firstRow}:K${lastRow}`).values;
if (reopenedTaskRows.length !== 36 || reopenedTaskRows.some((row, index) => row[0] !== tasks[index].id || row[7] !== tasks[index].status)) {
  throw new Error('Saved/reopened tasks lost IDs or status.');
}
const hash = crypto.createHash('sha256').update(await fs.readFile(outputPath)).digest('hex');
const currentSources = new Map(await Promise.all([...workbookSources.keys()]
  .map(async (relative) => [relative, await fs.readFile(path.join(repo, relative), 'utf8')])));
if (fingerprint(currentSources) !== sourceFingerprint) {
  throw new Error('Workbook sources changed during generation; regenerate before recording freshness.');
}
const sourceSidecar = path.join(path.dirname(outputPath), 'workbook-source.json');
await fs.writeFile(sourceSidecar, JSON.stringify({
  schemaVersion: 1, sourceFingerprint, artifactSha256: hash,
}, null, 2) + '\n');
const verification = {
  project: registry.project, sourceDate: registry.updatedAt, records: 36,
  sheets: ['Tổng hợp', 'Lộ trình', 'Tasks'],
  totals: {
    ownerPoints: tasks.reduce((sum, task) => sum + task.points, 0),
    reviewPoints: tasks.reduce((sum, task) => sum + task.reviewPoints, 0),
    totalPoints: tasks.reduce((sum, task) => sum + task.points + task.reviewPoints, 0),
  },
  formulaValues: base, mutationRecalculation: 'passed-and-restored',
  exportImportRoundtrip: 'passed', errorScan: errors.ndjson,
  output: path.relative(repo, outputPath).replaceAll('\\', '/'), sha256: hash, sourceFingerprint,
  limitations: ['Native Excel application not launched. Formula recalculation/export/import verified with artifact-tool.', 'This workbook is a generated snapshot; status must be updated in task Markdown and regenerated.'],
};
await fs.writeFile(path.join(qaDir, 'workbook-verification.json'), JSON.stringify(verification, null, 2));
console.log(JSON.stringify({ output: outputPath, sha256: hash, sourceFingerprint, records: tasks.length, formulaMutation: 'passed', roundtrip: 'passed' }));
