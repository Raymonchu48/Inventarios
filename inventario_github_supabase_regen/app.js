
const STORAGE_KEYS = {
  url: "inventario.supabase.url",
  key: "inventario.supabase.anon"
};

const state = {
  client: null,
  productos: [],
  categorias: [],
  movimientos: [],
  ready: false
};

const els = {};
document.addEventListener("DOMContentLoaded", init);

function init() {
  bindEls();
  bindEvents();
  hydrateConfig();
  switchView("dashboard");
  maybeInitFromConfig();
}

function bindEls() {
  [
    "connectionBadge","connectionText","viewTitle","kpiProductos","kpiStock","kpiBajoMinimo","kpiSinStock",
    "criticalList","recentMoves","searchInput","categoryFilter","stockFilter","productsTable","movementProduct",
    "movementType","movementQty","movementNote","movementHistory","supabaseUrl","supabaseKey","productDialog",
    "productDialogTitle","productId","pStockCode","pDescripcion","pPresentacion","pStDate","pUnit","pCantidad",
    "pMinStock","pPagina","pCategoria","pCantidadOriginal","pDetalleCantidad"
  ].forEach(id => els[id] = document.getElementById(id));
}

function bindEvents() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      switchView(btn.dataset.view);
    });
  });

  document.getElementById("btnRefresh").addEventListener("click", refreshAll);
  document.getElementById("btnSeed").addEventListener("click", seedInitialData);
  document.getElementById("configForm").addEventListener("submit", saveConfig);
  document.getElementById("btnClearConfig").addEventListener("click", clearConfig);
  document.getElementById("btnTestConnection").addEventListener("click", testConnection);
  document.getElementById("btnNewProduct").addEventListener("click", () => openProductDialog());
  document.getElementById("btnCloseDialog").addEventListener("click", () => els.productDialog.close());
  document.getElementById("productForm").addEventListener("submit", saveProduct);
  document.getElementById("movementForm").addEventListener("submit", saveMovement);
  els.searchInput.addEventListener("input", renderProducts);
  els.categoryFilter.addEventListener("change", renderProducts);
  els.stockFilter.addEventListener("change", renderProducts);
}

function switchView(view) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(`view-${view}`).classList.add("active");
  const titles = { dashboard:"Dashboard", productos:"Productos", movimientos:"Movimientos", configuracion:"Configuración" };
  els.viewTitle.textContent = titles[view] || "Inventario Pro";
}

function hydrateConfig() {
  const cfg = readConfig();
  els.supabaseUrl.value = cfg.url || (window.APP_CONFIG?.SUPABASE_URL || "");
  els.supabaseKey.value = cfg.key || (window.APP_CONFIG?.SUPABASE_ANON_KEY || "");
}

function readConfig() {
  return {
    url: localStorage.getItem(STORAGE_KEYS.url) || "",
    key: localStorage.getItem(STORAGE_KEYS.key) || ""
  };
}

function setConnectionState(ok, text) {
  els.connectionBadge.textContent = ok ? "Conectado" : "Sin conexión";
  els.connectionBadge.className = `badge ${ok ? "on" : "off"}`;
  els.connectionText.textContent = text;
}

async function maybeInitFromConfig() {
  const { url, key } = { url: els.supabaseUrl.value.trim(), key: els.supabaseKey.value.trim() };
  if (!url || !key) {
    setConnectionState(false, "Configura Supabase para empezar.");
    return;
  }
  await initSupabase(url, key);
}

async function initSupabase(url, key) {
  try {
    state.client = supabase.createClient(url, key);
    const { error } = await state.client.from("categorias").select("id", { count: "exact", head: true });
    if (error) throw error;
    state.ready = true;
    setConnectionState(true, "Supabase listo.");
    await refreshAll();
  } catch (err) {
    state.ready = false;
    console.error(err);
    setConnectionState(false, `Error: ${err.message}`);
    alert("No pude conectar con Supabase. Revisa la URL, la anon key y que hayas ejecutado schema.sql.");
  }
}

async function saveConfig(ev) {
  ev.preventDefault();
  localStorage.setItem(STORAGE_KEYS.url, els.supabaseUrl.value.trim());
  localStorage.setItem(STORAGE_KEYS.key, els.supabaseKey.value.trim());
  await initSupabase(els.supabaseUrl.value.trim(), els.supabaseKey.value.trim());
}

function clearConfig() {
  localStorage.removeItem(STORAGE_KEYS.url);
  localStorage.removeItem(STORAGE_KEYS.key);
  els.supabaseUrl.value = "";
  els.supabaseKey.value = "";
  state.client = null;
  state.ready = false;
  setConnectionState(false, "Configuración eliminada.");
}

async function testConnection() {
  const url = els.supabaseUrl.value.trim();
  const key = els.supabaseKey.value.trim();
  if (!url || !key) return alert("Pega la URL y la anon key.");
  await initSupabase(url, key);
}

async function refreshAll() {
  if (!ensureReady()) return;
  await Promise.all([loadCategorias(), loadProductos(), loadMovimientos()]);
  populateCategoryFilters();
  renderDashboard();
  renderProducts();
  populateProductSelects();
  renderMovementHistory();
}

function ensureReady() {
  if (!state.ready || !state.client) {
    alert("Primero conecta Supabase.");
    return false;
  }
  return true;
}

async function loadCategorias() {
  const { data, error } = await state.client.from("categorias").select("*").order("nombre");
  if (error) return handleError(error);
  state.categorias = data || [];
}

async function loadProductos() {
  const { data, error } = await state.client
    .from("productos")
    .select("*, categorias(id,nombre)")
    .order("descripcion");
  if (error) return handleError(error);
  state.productos = data || [];
}

async function loadMovimientos() {
  const { data, error } = await state.client
    .from("movimientos")
    .select("*, productos(id, descripcion, stock_code)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return handleError(error);
  state.movimientos = data || [];
}

function renderDashboard() {
  const totalProductos = state.productos.length;
  const stockTotal = state.productos.reduce((acc, p) => acc + Number(p.cantidad || 0), 0);
  const bajos = state.productos.filter(p => Number(p.cantidad || 0) <= Number(p.min_stock || 0)).length;
  const sin = state.productos.filter(p => Number(p.cantidad || 0) <= 0).length;

  els.kpiProductos.textContent = totalProductos;
  els.kpiStock.textContent = formatNum(stockTotal);
  els.kpiBajoMinimo.textContent = bajos;
  els.kpiSinStock.textContent = sin;

  renderCriticalList();
  renderRecentMoves();
}

function renderCriticalList() {
  const critical = state.productos
    .filter(p => Number(p.cantidad || 0) <= Number(p.min_stock || 0))
    .sort((a, b) => Number(a.cantidad || 0) - Number(b.cantidad || 0))
    .slice(0, 10);

  els.criticalList.innerHTML = "";
  if (!critical.length) return renderEmpty(els.criticalList, "No hay productos críticos.");
  critical.forEach(p => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <strong>${escapeHtml(p.descripcion)} <span class="tag danger">${formatNum(p.cantidad)} / mín. ${formatNum(p.min_stock)}</span></strong>
      <small>${escapeHtml(p.stock_code || "Sin código")} · ${escapeHtml(p.categorias?.nombre || "Sin categoría")}</small>
    `;
    els.criticalList.appendChild(div);
  });
}

function renderRecentMoves() {
  els.recentMoves.innerHTML = "";
  if (!state.movimientos.length) return renderEmpty(els.recentMoves, "Todavía no hay movimientos.");
  state.movimientos.slice(0, 8).forEach(m => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <strong>${escapeHtml(m.productos?.descripcion || "Producto")} <span class="tag ${m.tipo === "salida" ? "danger" : m.tipo === "ajuste" ? "warn" : "ok"}">${escapeHtml(m.tipo)}</span></strong>
      <small>${formatNum(m.cantidad)} · ${formatDate(m.created_at)} · ${escapeHtml(m.nota || "")}</small>
    `;
    els.recentMoves.appendChild(div);
  });
}

function populateCategoryFilters() {
  const current = els.categoryFilter.value;
  els.categoryFilter.innerHTML = `<option value="">Todas las categorías</option>`;
  els.pCategoria.innerHTML = `<option value="">Sin categoría</option>`;
  state.categorias.forEach(c => {
    els.categoryFilter.insertAdjacentHTML("beforeend", `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`);
    els.pCategoria.insertAdjacentHTML("beforeend", `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`);
  });
  els.categoryFilter.value = current;
}

function getFilteredProducts() {
  const q = els.searchInput.value.trim().toLowerCase();
  const cat = els.categoryFilter.value;
  const stockMode = els.stockFilter.value;
  return state.productos.filter(p => {
    const matchText = !q || [p.stock_code, p.descripcion, p.presentacion].some(v => (v || "").toLowerCase().includes(q));
    const matchCat = !cat || p.categoria_id === cat;
    const qty = Number(p.cantidad || 0);
    const min = Number(p.min_stock || 0);
    const matchStock = !stockMode
      || (stockMode === "low" && qty <= min)
      || (stockMode === "out" && qty <= 0)
      || (stockMode === "ok" && qty > min);
    return matchText && matchCat && matchStock;
  });
}

function renderProducts() {
  const rows = getFilteredProducts();
  els.productsTable.innerHTML = "";
  if (!rows.length) return els.productsTable.innerHTML = `<tr><td colspan="8"><div class="empty-state">No hay productos para ese filtro.</div></td></tr>`;
  rows.forEach(p => {
    const qty = Number(p.cantidad || 0);
    const min = Number(p.min_stock || 0);
    const statusClass = qty <= 0 ? "danger" : qty <= min ? "warn" : "ok";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(p.stock_code || "")}</td>
      <td><strong>${escapeHtml(p.descripcion)}</strong><br><small class="muted">${escapeHtml(p.presentacion || "")}</small></td>
      <td>${escapeHtml(p.categorias?.nombre || "Sin categoría")}</td>
      <td>${escapeHtml(p.unit || "")}</td>
      <td><span class="tag ${statusClass}">${formatNum(qty)}</span></td>
      <td>${formatNum(min)}</td>
      <td>${p.pagina ?? ""}</td>
      <td>
        <div class="actions">
          <button class="btn-mini" data-action="edit" data-id="${p.id}">Editar</button>
          <button class="btn-mini danger" data-action="delete" data-id="${p.id}">Borrar</button>
        </div>
      </td>
    `;
    els.productsTable.appendChild(tr);
  });

  els.productsTable.querySelectorAll("[data-action='edit']").forEach(btn => btn.addEventListener("click", () => {
    const product = state.productos.find(p => p.id === btn.dataset.id);
    openProductDialog(product);
  }));
  els.productsTable.querySelectorAll("[data-action='delete']").forEach(btn => btn.addEventListener("click", () => deleteProduct(btn.dataset.id)));
}

function populateProductSelects() {
  const current = els.movementProduct.value;
  els.movementProduct.innerHTML = `<option value="">Selecciona un producto</option>`;
  state.productos.forEach(p => {
    els.movementProduct.insertAdjacentHTML("beforeend", `<option value="${p.id}">${escapeHtml(p.descripcion)} (${escapeHtml(p.stock_code || "sin código")})</option>`);
  });
  if ([...els.movementProduct.options].some(o => o.value === current)) els.movementProduct.value = current;
}

function openProductDialog(product = null) {
  els.productDialogTitle.textContent = product ? "Editar producto" : "Nuevo producto";
  els.productId.value = product?.id || "";
  els.pStockCode.value = product?.stock_code || "";
  els.pDescripcion.value = product?.descripcion || "";
  els.pPresentacion.value = product?.presentacion || "";
  els.pStDate.value = product?.st_date || "";
  els.pUnit.value = product?.unit || "";
  els.pCantidad.value = product?.cantidad ?? 0;
  els.pMinStock.value = product?.min_stock ?? 0;
  els.pPagina.value = product?.pagina ?? "";
  els.pCategoria.value = product?.categoria_id || "";
  els.pCantidadOriginal.value = product?.cantidad_original || "";
  els.pDetalleCantidad.value = product?.detalle_cantidad || "";
  els.productDialog.showModal();
}

async function saveProduct(ev) {
  ev.preventDefault();
  if (!ensureReady()) return;
  const payload = {
    stock_code: val("pStockCode") || null,
    descripcion: val("pDescripcion"),
    presentacion: val("pPresentacion") || null,
    st_date: val("pStDate") || null,
    unit: val("pUnit") || null,
    cantidad: numVal("pCantidad"),
    min_stock: numVal("pMinStock"),
    pagina: intOrNull(val("pPagina")),
    categoria_id: val("pCategoria") || null,
    cantidad_original: val("pCantidadOriginal") || null,
    detalle_cantidad: val("pDetalleCantidad") || null
  };

  const id = val("productId");
  let error;
  if (id) ({ error } = await state.client.from("productos").update(payload).eq("id", id));
  else ({ error } = await state.client.from("productos").insert(payload));
  if (error) return handleError(error);
  els.productDialog.close();
  await refreshAll();
}

async function deleteProduct(id) {
  if (!ensureReady()) return;
  const ok = confirm("¿Seguro que quieres borrar este producto? También eliminarás sus movimientos.");
  if (!ok) return;
  const { error } = await state.client.from("productos").delete().eq("id", id);
  if (error) return handleError(error);
  await refreshAll();
}

async function saveMovement(ev) {
  ev.preventDefault();
  if (!ensureReady()) return;
  const productId = els.movementProduct.value;
  const type = els.movementType.value;
  const qty = Number(els.movementQty.value);
  const note = els.movementNote.value.trim();
  if (!productId || !qty || qty <= 0) return alert("Selecciona producto y una cantidad válida.");

  const product = state.productos.find(p => p.id === productId);
  if (!product) return alert("Producto no encontrado.");
  const prev = Number(product.cantidad || 0);
  let next = prev;
  if (type === "entrada") next = prev + qty;
  if (type === "salida") next = prev - qty;
  if (type === "ajuste") next = qty;
  if (next < 0) return alert("La salida deja stock negativo. Revisa la cantidad.");

  let { error } = await state.client.from("productos").update({ cantidad: next }).eq("id", productId);
  if (error) return handleError(error);

  ({ error } = await state.client.from("movimientos").insert({
    producto_id: productId,
    tipo: type,
    cantidad: qty,
    stock_anterior: prev,
    stock_nuevo: next,
    nota: note || null
  }));
  if (error) return handleError(error);

  ev.target.reset();
  await refreshAll();
}

function renderMovementHistory() {
  els.movementHistory.innerHTML = "";
  if (!state.movimientos.length) return renderEmpty(els.movementHistory, "Todavía no hay movimientos.");
  state.movimientos.forEach(m => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <strong>${escapeHtml(m.productos?.descripcion || "Producto")} <span class="tag ${m.tipo === "salida" ? "danger" : m.tipo === "ajuste" ? "warn" : "ok"}">${escapeHtml(m.tipo)}</span></strong>
      <small>${formatDate(m.created_at)} · ${formatNum(m.stock_anterior)} → ${formatNum(m.stock_nuevo)} · Cantidad ${formatNum(m.cantidad)}</small>
      ${m.nota ? `<div style="margin-top:6px" class="muted">${escapeHtml(m.nota)}</div>` : ""}
    `;
    els.movementHistory.appendChild(div);
  });
}

async function seedInitialData() {
  if (!ensureReady()) return;
  const ok = confirm("Esto insertará el inventario inicial desde data.json en Supabase. Si ya existe código repetido, ese producto se saltará.");
  if (!ok) return;

  try {
    const res = await fetch("data.json");
    const items = await res.json();

    const uniqueCats = [...new Set(items.map(x => x.categoria).filter(Boolean))];
    for (const nombre of uniqueCats) {
      const { error } = await state.client.from("categorias").upsert({ nombre }, { onConflict: "nombre" });
      if (error) throw error;
    }

    await loadCategorias();
    const catMap = new Map(state.categorias.map(c => [c.nombre, c.id]));

    const payload = items.map(x => ({
      stock_code: x.stock_code || null,
      descripcion: x.descripcion,
      presentacion: x.presentacion || null,
      st_date: x.st_date || null,
      unit: x.unit || null,
      cantidad: Number(x.cantidad || 0),
      cantidad_original: x.cantidad_original || null,
      detalle_cantidad: x.detalle_cantidad || null,
      pagina: x.pagina ?? null,
      min_stock: Number(x.min_stock || 0),
      categoria_id: catMap.get(x.categoria) || null
    }));

    // chunked insert to avoid payload limits
    const size = 50;
    for (let i = 0; i < payload.length; i += size) {
      const chunk = payload.slice(i, i + size);
      const { error } = await state.client.from("productos").upsert(chunk, { onConflict: "stock_code" });
      if (error) throw error;
    }
    alert("Inventario inicial importado.");
    await refreshAll();
  } catch (err) {
    handleError(err);
  }
}

function renderEmpty(container, text) {
  container.innerHTML = `<div class="empty-state">${escapeHtml(text)}</div>`;
}

function val(id) { return document.getElementById(id).value.trim(); }
function numVal(id) { return Number(document.getElementById(id).value || 0); }
function intOrNull(v) { return v === "" ? null : parseInt(v, 10); }
function formatNum(v) { return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(Number(v || 0)); }
function formatDate(v) {
  try { return new Date(v).toLocaleString("es-ES"); } catch { return v || ""; }
}
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}
function handleError(err) {
  console.error(err);
  alert(err.message || "Ha ocurrido un error.");
}
