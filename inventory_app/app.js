const DB_KEY = "inventario-pro-db-v1";
const SEED_FILE = "data.json";

const state = {
  rows: [],
  filtered: []
};

const $ = (id) => document.getElementById(id);
const body = $("inventoryBody");
const tpl = $("rowTemplate");

function uid() {
  return Math.random().toString(16).slice(2, 10);
}

async function loadSeed() {
  const res = await fetch(SEED_FILE);
  if (!res.ok) throw new Error("No se pudo cargar el archivo semilla.");
  return await res.json();
}

function saveLocal() {
  localStorage.setItem(DB_KEY, JSON.stringify(state.rows));
  updateStatus();
}

function loadLocal() {
  const raw = localStorage.getItem(DB_KEY);
  return raw ? JSON.parse(raw) : [];
}

function updateStatus() {
  const count = state.rows.length;
  $("statusPill").textContent = count ? `Base local activa · ${count} registros` : "Base local vacía";
}

function populateFilters() {
  const categories = [...new Set(state.rows.map(r => r.categoria).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
  const pages = [...new Set(state.rows.map(r => r.pagina).filter(v => v !== "" && v !== null && v !== undefined))].sort((a,b)=>a-b);

  $("categoryFilter").innerHTML = `<option value="">Todas las categorías</option>` + categories.map(c => `<option>${escapeHtml(c)}</option>`).join("");
  $("pageFilter").innerHTML = `<option value="">Todas las páginas</option>` + pages.map(p => `<option>${p}</option>`).join("");
}

function applyFilters() {
  const q = $("searchInput").value.trim().toLowerCase();
  const category = $("categoryFilter").value;
  const page = $("pageFilter").value;
  const stockMode = $("stockFilter").value;

  state.filtered = state.rows.filter(r => {
    const hay = [r.stockCode, r.descripcion, r.presentacion, r.categoria, r.unidad].join(" ").toLowerCase();
    if (q && !hay.includes(q)) return false;
    if (category && r.categoria !== category) return false;
    if (page && String(r.pagina) !== String(page)) return false;
    if (stockMode === "with-number" && (r.cantidadNumerica === null || r.cantidadNumerica === "" || Number.isNaN(Number(r.cantidadNumerica)))) return false;
    if (stockMode === "without-number" && !(r.cantidadNumerica === null || r.cantidadNumerica === "" || Number.isNaN(Number(r.cantidadNumerica)))) return false;
    if (stockMode === "low-stock" && !(Number(r.cantidadNumerica) <= 1 && r.cantidadNumerica !== null && r.cantidadNumerica !== "")) return false;
    return true;
  });

  renderTable();
  renderKpis();
}

function renderKpis() {
  $("kpiTotal").textContent = state.rows.length;
  $("kpiCategories").textContent = new Set(state.rows.map(r => r.categoria).filter(Boolean)).size;
  $("kpiLow").textContent = state.rows.filter(r => r.cantidadNumerica !== null && r.cantidadNumerica !== "" && Number(r.cantidadNumerica) <= 1).length;
  $("kpiMissing").textContent = state.rows.filter(r => r.cantidadNumerica === null || r.cantidadNumerica === "").length;
  $("tableCount").textContent = `${state.filtered.length} registros`;
}

function renderTable() {
  body.innerHTML = "";
  for (const row of state.filtered) {
    const tr = tpl.content.firstElementChild.cloneNode(true);
    for (const cell of tr.querySelectorAll("[data-k]")) {
      const key = cell.dataset.k;
      let value = row[key] ?? "";
      if (key === "cantidadNumerica" && value !== "" && value !== null) {
        const num = Number(value);
        value = Number.isInteger(num) ? String(num) : String(num);
        if (num <= 1) cell.classList.add("low-stock");
      }
      if (key === "cantidadNumerica" && (value === "" || value === null)) {
        cell.classList.add("no-stock");
        value = "—";
      }
      cell.textContent = value;
    }
    tr.querySelector(".edit-btn").addEventListener("click", () => openEditor(row.id));
    tr.querySelector(".delete-btn").addEventListener("click", () => deleteItem(row.id));
    body.appendChild(tr);
  }
}

function openEditor(id = null) {
  const row = state.rows.find(r => r.id === id) || {
    id: "",
    pagina: "",
    stockCode: "",
    descripcion: "",
    presentacion: "",
    stDate: "",
    unidad: "",
    cantidadOriginal: "",
    cantidadNumerica: "",
    detalleCantidad: "",
    categoria: ""
  };

  $("dialogTitle").textContent = id ? "Editar artículo" : "Nuevo artículo";
  $("itemId").value = row.id || "";
  $("fPagina").value = row.pagina ?? "";
  $("fStockCode").value = row.stockCode ?? "";
  $("fDescripcion").value = row.descripcion ?? "";
  $("fPresentacion").value = row.presentacion ?? "";
  $("fStDate").value = row.stDate ?? "";
  $("fUnidad").value = row.unidad ?? "";
  $("fCantidadOriginal").value = row.cantidadOriginal ?? "";
  $("fCantidadNumerica").value = row.cantidadNumerica ?? "";
  $("fDetalleCantidad").value = row.detalleCantidad ?? "";
  $("fCategoria").value = row.categoria ?? "";
  $("itemDialog").showModal();
}

function getFormRow() {
  const cantidad = $("fCantidadNumerica").value.trim();
  return {
    id: $("itemId").value || uid(),
    pagina: $("fPagina").value ? Number($("fPagina").value) : "",
    stockCode: $("fStockCode").value.trim(),
    descripcion: $("fDescripcion").value.trim(),
    presentacion: $("fPresentacion").value.trim(),
    stDate: $("fStDate").value.trim(),
    unidad: $("fUnidad").value.trim(),
    cantidadOriginal: $("fCantidadOriginal").value.trim(),
    cantidadNumerica: cantidad === "" ? null : Number(cantidad),
    detalleCantidad: $("fDetalleCantidad").value.trim(),
    categoria: $("fCategoria").value.trim(),
    updatedAt: new Date().toISOString()
  };
}

function upsertRow(newRow) {
  const idx = state.rows.findIndex(r => r.id === newRow.id);
  if (idx >= 0) state.rows[idx] = newRow;
  else state.rows.unshift(newRow);
  saveLocal();
  populateFilters();
  applyFilters();
}

function deleteItem(id) {
  const row = state.rows.find(r => r.id === id);
  if (!row) return;
  const ok = confirm(`¿Borrar "${row.descripcion}" del inventario?`);
  if (!ok) return;
  state.rows = state.rows.filter(r => r.id !== id);
  saveLocal();
  populateFilters();
  applyFilters();
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state.rows, null, 2)], { type: "application/json" });
  downloadBlob(blob, "inventario_exportado.json");
}

function exportCsv() {
  const headers = ["id","pagina","stockCode","descripcion","presentacion","stDate","unidad","cantidadOriginal","cantidadNumerica","detalleCantidad","categoria","updatedAt"];
  const lines = [headers.join(",")];
  for (const r of state.rows) {
    const vals = headers.map(h => csvEscape(r[h]));
    lines.push(vals.join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, "inventario_exportado.csv");
}

function csvEscape(v) {
  if (v === null || v === undefined) return "";
  const s = String(v).replaceAll('"', '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function seedDatabase() {
  const seed = await loadSeed();
  state.rows = seed;
  saveLocal();
  populateFilters();
  applyFilters();
}

function resetLocal() {
  const ok = confirm("Esto eliminará la base local del navegador y dejará la app vacía. ¿Continuar?");
  if (!ok) return;
  localStorage.removeItem(DB_KEY);
  state.rows = [];
  populateFilters();
  applyFilters();
  updateStatus();
}

async function importJsonFile(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error("El JSON debe ser un array de artículos.");
  state.rows = data;
  saveLocal();
  populateFilters();
  applyFilters();
}

function bindEvents() {
  $("btnSeed").addEventListener("click", async () => {
    try { await seedDatabase(); } 
    catch (e) { alert(e.message); }
  });

  $("btnAdd").addEventListener("click", () => openEditor());
  $("btnExportJson").addEventListener("click", exportJson);
  $("btnExportCsv").addEventListener("click", exportCsv);
  $("btnReset").addEventListener("click", resetLocal);
  $("importJson").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { await importJsonFile(file); } 
    catch (err) { alert("Importación fallida: " + err.message); }
    e.target.value = "";
  });

  ["searchInput","categoryFilter","pageFilter","stockFilter"].forEach(id => {
    $(id).addEventListener("input", applyFilters);
    $(id).addEventListener("change", applyFilters);
  });

  $("itemForm").addEventListener("submit", (e) => {
    e.preventDefault();
    upsertRow(getFormRow());
    $("itemDialog").close();
  });
}

async function init() {
  bindEvents();
  state.rows = loadLocal();
  populateFilters();
  applyFilters();
  updateStatus();
}
init();
