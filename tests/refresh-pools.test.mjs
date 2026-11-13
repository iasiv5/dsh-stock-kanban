import { test } from "node:test";
import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import { normalizeInputCode } from "../src/identity.mjs";
import {
  BOUNDS,
  SEG,
  buildManifest,
  canonicalJson,
  collectPools,
  createFetcher,
  diffRows,
  normalizeName,
  parseEmPage,
  parseHkexSecurities,
  parseSseStockList,
  parseSzseEtf,
  parseSzseStocks,
  parseTencentNames,
  parseYunhqList,
  readXlsxRows,
  reconcile,
  shrinkProblems,
  sortRows,
  validatePool,
} from "../scripts/refresh-pools.mjs";

// 仅测试用的最小 zip 写入器：在内存中构造 xlsx 结构，避免提交二进制夹具。
function buildZip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const file of files) {
    const nameBuf = Buffer.from(file.name, "utf8");
    const body = deflateRawSync(file.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, body);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + body.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, eocd]);
}

test("normalizeName：去标签、NFKC、压缩空白", () => {
  assert.equal(normalizeName("<a href='x'><u>万  科Ａ</u></a>"), "万 科A");
  assert.equal(normalizeName("  平安银行 "), "平安银行");
});

test("号段过滤：只保留股票号段，剔除 B 股与老三板代码", () => {
  assert.ok(SEG.shA.test("600000") && SEG.shA.test("688001"));
  assert.ok(!SEG.shA.test("900901"));
  assert.ok(SEG.szA.test("000001") && SEG.szA.test("300750"));
  assert.ok(!SEG.szA.test("200001"));
  assert.ok(SEG.bj.test("920000"));
  assert.ok(!SEG.bj.test("810001") && !SEG.bj.test("833001"));
  assert.ok(SEG.szEtf.test("159915") && !SEG.szEtf.test("510300"));
  assert.ok(SEG.shEtf.test("510300") && !SEG.shEtf.test("159915"));
});

test("上交所：保留上市(2)与 ST(7)，剔除退市(3)与代码异常", () => {
  const rows = parseSseStockList({
    result: [
      { A_STOCK_CODE: "600000", STATE_CODE: "2", DELIST_DATE: "-", SEC_NAME_CN: "浦发银行", COMPANY_ABBR: "浦发银行" },
      { A_STOCK_CODE: "600053", STATE_CODE: "7", DELIST_DATE: "-", SEC_NAME_CN: "*ST九鼎", COMPANY_ABBR: "*ST九鼎" },
      { A_STOCK_CODE: "600001", STATE_CODE: "3", DELIST_DATE: "20091229", SEC_NAME_CN: "-", COMPANY_ABBR: "邯郸钢铁" },
      { A_STOCK_CODE: "-", STATE_CODE: "2", DELIST_DATE: "-", SEC_NAME_CN: "无效", COMPANY_ABBR: "无效" },
    ],
  });
  assert.deepEqual(rows, [
    { code: "600000", name: "浦发银行" },
    { code: "600053", name: "*ST九鼎" },
  ]);
});

test("深交所 A 股：agjc 去 HTML 标签，全角字母规范化，代码异常剔除", () => {
  const rows = parseSzseStocks([
    { agdm: "000001", agjc: "<a href='x'><u>平安银行</u></a>" },
    { agdm: "000002", agjc: "<a href='y'><u>万  科Ａ</u></a>" },
    { agdm: "bad", agjc: "x" },
  ]);
  assert.deepEqual(rows, [
    { code: "000001", name: "平安银行" },
    { code: "000002", name: "万 科A" },
  ]);
});

test("深交所 ETF：代码与简称取自 <u> 标签", () => {
  const rows = parseSzseEtf([
    {
      sys_key: "<a href='x'><u>158076</u></a>",
      kzjcurl: "<a href='y' title='z'><u>红利低波ETF广发</u></a> <a href='q'>其他</a>",
    },
  ]);
  assert.deepEqual(rows, [{ code: "158076", name: "红利低波ETF广发" }]);
});

test("yunhq 列表：total 与 list 长度不一致即失败（防分页丢失）", () => {
  const ok = JSON.stringify({ total: 2, list: [["600000", "浦发银行"], ["510010", "治理ETF"]] });
  assert.deepEqual(parseYunhqList(ok), [
    { code: "600000", name: "浦发银行" },
    { code: "510010", name: "治理ETF" },
  ]);
  const short = JSON.stringify({ total: 3, list: [["600000", "浦发银行"]] });
  assert.throws(() => parseYunhqList(short), /不一致/);
});

test("yunhq 列表：JSONP 包装的响应同样可解析", () => {
  const text = "cb(" + JSON.stringify({ total: 1, list: [["511600", "华安日日鑫ETF"]] }) + ");";
  assert.deepEqual(parseYunhqList(text), [{ code: "511600", name: "华安日日鑫ETF" }]);
});

test("东方财富 clist 单页：f12 代码、f14 名称与 total", () => {
  const page = parseEmPage({
    data: {
      total: 2,
      diff: [
        { f12: "300528", f13: 0, f14: "幸福蓝海" },
        { f12: "000001", f13: 0, f14: "平安银行" },
      ],
    },
  });
  assert.equal(page.total, 2);
  assert.deepEqual(page.rows, [
    { code: "300528", name: "幸福蓝海" },
    { code: "000001", name: "平安银行" },
  ]);
  assert.throws(() => parseEmPage({ data: null }), /结构异常/);
});

test("对账：双向差异计数与比例", () => {
  const r = reconcile([{ code: "a" }, { code: "b" }], [{ code: "b" }, { code: "c" }]);
  assert.equal(r.onlyQuote, 1);
  assert.equal(r.onlyOfficial, 1);
  assert.equal(r.ratio, 1);
  assert.deepEqual(reconcile([{ code: "x" }], [{ code: "x" }]).ratio, 0);
});

test("腾讯报价：空名称或价格为 0 的条目不计入", () => {
  const text = [
    'v_bj920000="62~安徽凤凰~920000~10.90~11.10~11.10~2662"',
    'v_bj920001="62~~920001~0~0~0"',
    'v_bj920002="62~万达轴承~920002~0~0"',
    'v_pv_none_match="1";',
  ].join("\n");
  assert.deepEqual([...parseTencentNames(text)], [["bj920000", "安徽凤凰"]]);
});

test("xlsx 读取：共享字符串、内联字符串与空单元格按列对齐", () => {
  const sheet =
    '<?xml version="1.0"?><worksheet><sheetData>' +
    '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1"><v>5</v></c><c r="D1" t="inlineStr"><is><t>内联</t></is></c></row>' +
    '<row r="2"><c r="A2"/><c r="B2" t="s"><v>1</v></c></row>' +
    "</sheetData></worksheet>";
  const sst = '<sst><si><t>Stock Code</t></si><si><t xml:space="preserve">A &amp; B</t></si></sst>';
  const zip = buildZip([
    { name: "xl/worksheets/sheet1.xml", data: Buffer.from(sheet, "utf8") },
    { name: "xl/sharedStrings.xml", data: Buffer.from(sst, "utf8") },
  ]);
  assert.deepEqual(readXlsxRows(zip), [
    ["Stock Code", "", "5", "内联"],
    ["", "A & B"],
  ]);
});

test("xlsx 读取：带命名空间前缀的标签（x: 前缀，Excel 导出形态）同样可解析", () => {
  const sheet =
    '<?xml version="1.0"?><x:worksheet xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><x:sheetData>' +
    '<x:row r="1"><x:c r="A1" t="s"><x:v>0</x:v></x:c><x:c r="B1" t="s"><x:v>1</x:v></x:c></x:row>' +
    '<x:row r="2"><x:c r="A2"><x:v>00001</x:v></x:c></x:row>' +
    "</x:sheetData></x:worksheet>";
  const sst =
    '<?xml version="1.0"?><x:sst xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><x:si><x:t>Stock Code</x:t></x:si><x:si><x:t>Name</x:t></x:si></x:sst>';
  const zip = buildZip([
    { name: "xl/worksheets/sheet1.xml", data: Buffer.from(sheet, "utf8") },
    { name: "xl/sharedStrings.xml", data: Buffer.from(sst, "utf8") },
  ]);
  assert.deepEqual(readXlsxRows(zip), [["Stock Code", "Name"], ["00001"]]);
});

test("港交所：只保留港币计价的股票与 ETP，剔除窝轮、债券与人民币柜台", () => {
  const rows = [
    ["List of Securities"],
    [],
    ["Stock Code", "Name of Securities", "Category", "Sub-Category", "Trading Currency"],
    ["00001", "CKH HOLDINGS", "Equity", "Equity Securities (Main Board)", "HKD"],
    ["80700", "TENCENT-R", "Equity", "Equity Securities (Main Board)", "RMB"],
    ["02800", "TRACKER FUND", "Exchange Traded Products", "Exchange Traded Funds", "HKD"],
    ["12345", "SOME WARRANT", "Derivative Warrants", "Warrants", "HKD"],
    ["03308", "SUNNY", "Equity", "Equity Securities (Main Board)", "HKD"],
  ];
  const out = parseHkexSecurities(rows);
  assert.deepEqual(
    out.map((r) => r.code),
    ["hk00001", "hk02800", "hk03308"],
  );
  assert.equal(out[0].nameEn, "CKH HOLDINGS");
});

test("规范化输出：按代码升序，同一输入得到同一字节", () => {
  const rows = sortRows([
    { code: "sz000002", name: "b" },
    { code: "sh600000", name: "a" },
  ]);
  assert.deepEqual(
    rows.map((r) => r.code),
    ["sh600000", "sz000002"],
  );
  assert.equal(canonicalJson(rows), canonicalJson(sortRows(rows)));
  assert.equal(canonicalJson(rows), JSON.stringify(rows, null, 2) + "\n");
});

test("validatePool：代码格式、空名称与重复代码均报告", () => {
  const problems = validatePool("a_stocks", [
    { code: "600000", name: "浦发银行" },
    { code: "600000", name: "重复" },
    { code: "sh600001", name: "前缀错误" },
    { code: "600002", name: "" },
  ]);
  assert.equal(problems.length, 3);
});

test("收缩守卫：下降超过 5% 需显式确认；区间覆盖当前规模", () => {
  assert.equal(shrinkProblems("a_stocks", 100, 90, false).length, 1);
  assert.equal(shrinkProblems("a_stocks", 100, 96, false).length, 0);
  assert.equal(shrinkProblems("a_stocks", 100, 90, true).length, 0);
  assert.ok(BOUNDS.aStocks[0] < 5549 && BOUNDS.aStocks[1] > 5549);
});

test("差异报告：新增、移除与改名分别计数", () => {
  const d = diffRows(
    [
      { code: "a", name: "x" },
      { code: "b", name: "y" },
    ],
    [
      { code: "a", name: "x2" },
      { code: "c", name: "z" },
    ],
  );
  assert.equal(d.added, 1);
  assert.equal(d.removed, 1);
  assert.equal(d.renamed, 1);
});

test("manifest 结构：schema、生成器与来源登记", () => {
  const m = buildManifest({ generatedAt: "2026-11-13T00:00:00.000Z", sources: [], files: {} });
  assert.equal(m.schema, 1);
  assert.equal(m.generator.tool, "scripts/refresh-pools.mjs");
});

test("代码规范化与生成器输出一致：北交所 920 号段、ETF 前缀", () => {
  assert.equal(normalizeInputCode("cn", "920000"), "bj920000");
  assert.equal(normalizeInputCode("cn", "sh511600"), "sh511600");
  assert.equal(normalizeInputCode("cn", "600519"), "sh600519");
  assert.equal(normalizeInputCode("cn", "000001"), "sz000001");
});

test("抓取失败即整体失败：不产出部分结果", async () => {
  const get = createFetcher({
    fetchImpl: async () => new Response("unavailable", { status: 503 }),
    delays: [],
    pauseMs: 0,
  });
  await assert.rejects(() => collectPools({ get }), /抓取失败/);
});
