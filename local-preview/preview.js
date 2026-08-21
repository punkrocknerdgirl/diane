(function () {
  "use strict";

  const tickets = [
    { number: "DEMO-1001", date: "2026-08-07", broker: "DEMO", customerJob: "Preview Job", poNumber: "PO-DEMO", workOrder: "WO-DEMO", driver: "Demo Driver A", truck: "DEMO-TRUCK-01", material: "Demo Material", quantity: "25.50", rate: "12.00", origin: "Demo Quarry", destination: "Demo Site", reviewer: "Preview User", status: "DRAFT", notes: "Local-only preview ticket." },
    { number: "DEMO-1002", date: "2026-08-07", broker: "DEMO WEST", customerJob: "Preview Job B", poNumber: "PO-DEMO-2", workOrder: "WO-DEMO-2", driver: "Demo Driver B", truck: "DEMO-TRUCK-02", material: "Demo Aggregate", quantity: "18.00", rate: "10.50", origin: "Demo Pit", destination: "Demo Yard", reviewer: "Preview User", status: "HOLD", notes: "Synthetic second record." }
  ];
  const brokers = ["DEMO", "DEMO WEST", "DEMO EAST"];
  const drivers = [{ label: "Demo Driver A / DEMO-TRUCK-01", driver: "Demo Driver A", truck: "DEMO-TRUCK-01" }, { label: "Demo Driver B / DEMO-TRUCK-02", driver: "Demo Driver B", truck: "DEMO-TRUCK-02" }];
  let current = 0;
  let saved = false;

  const $ = (id) => document.getElementById(id);
  const text = (id, value) => { if ($(id)) $(id).textContent = value == null ? "" : value; };
  const value = (id, next) => { if ($(id)) $(id).value = next == null ? "" : next; };
  const statusClass = (status) => String(status || "DRAFT").toLowerCase().replace(/_/g, "-");
  const ticket = () => tickets[current];
  const total = (t) => (Number(t.quantity || 0) * Number(t.rate || 0)).toFixed(2);

  function setStatus(t) {
    ["headerStatus", "summaryStatus"].forEach((id) => { text(id, t.status); const el = $(id); if (el) el.className = "badge status-" + statusClass(t.status); });
    document.querySelectorAll("[data-ticket-summary-status]").forEach((el) => { el.textContent = t.status; el.className = "badge status-" + statusClass(t.status); });
  }
  function counters() { ["recordPositionTop", "recordPositionBottom", "recordPositionEditBottom"].forEach((id) => text(id, `Record ${current + 1} of ${tickets.length}`)); }
  function populateChoices() {
    const broker = $("broker"); if (broker) broker.innerHTML = brokers.map((x) => `<option>${x}</option>`).join("");
    const driverTruck = $("driverTruck"); if (driverTruck) driverTruck.innerHTML = drivers.map((x) => `<option value="${x.truck}">${x.label}</option>`).join("");
    const batch = $("existingBatchSelect"); if (batch) batch.innerHTML = "<option>DEMO BATCH - Local Preview</option>";
  }
  function renderFields() {
    const t = ticket();
    ["ticketNumber", "ticketDate", "poNumber", "workOrder", "customerJob", "origin", "destination", "material", "quantity", "rate", "reviewNotes"].forEach((id) => value(id, t[id === "ticketNumber" ? "number" : id]));
    value("broker", t.broker); value("driverTruck", t.truck); value("driver", t.driver); value("truck", t.truck); value("reviewer", t.reviewer); value("lineTotal", total(t));
    ["staticTicketNumber", "staticTicketDate", "staticTicketBroker", "staticTicketCustomerJob", "staticTicketPoNumber", "staticTicketWorkOrder", "staticTicketTruck", "staticTicketDriver", "staticTicketMaterial", "staticTicketQuantity", "staticTicketRate", "staticTicketOrigin", "staticTicketDestination", "staticTicketReviewer"].forEach((id) => text(id, t[{ staticTicketNumber: "number", staticTicketDate: "date", staticTicketBroker: "broker", staticTicketCustomerJob: "customerJob", staticTicketPoNumber: "poNumber", staticTicketWorkOrder: "workOrder", staticTicketTruck: "truck", staticTicketDriver: "driver", staticTicketMaterial: "material", staticTicketQuantity: "quantity", staticTicketRate: "rate", staticTicketOrigin: "origin", staticTicketDestination: "destination", staticTicketReviewer: "reviewer" }[id]]));
    text("staticTicketLineTotal", total(t)); text("prominentTicketNumber", t.number); setStatus(t); counters();
  }
  function renderOverview() {
    $("status").textContent = "Preview mode: synthetic local data only. No backend calls are available.";
    $("app").className = "";
    $("app").innerHTML = `<div class="batch-card status-draft"><div class="batch-card-header"><div><div class="batch-title">DEMO BATCH - Local Preview</div><div class="batch-meta">Preview batch · 2026-08-07 · ${tickets.length} synthetic tickets</div></div><span class="badge status-draft">DRAFT</span></div><table><thead><tr><th>Ticket</th><th>Date</th><th>Customer / Job</th><th>Status</th><th class="action-column">Action</th></tr></thead><tbody>${tickets.map((t, i) => `<tr class="ticket-row status-${statusClass(t.status)}"><td>${t.number}</td><td>${t.date}</td><td>${t.customerJob}</td><td><span class="badge status-${statusClass(t.status)}">${t.status}</span></td><td class="action-column"><button type="button" data-preview-ticket="${i}">Open</button></td></tr>`).join("")}</tbody></table></div>`;
    $("app").querySelectorAll("[data-preview-ticket]").forEach((button) => button.onclick = () => { current = Number(button.dataset.previewTicket); showDetail(); });
  }
  function showDetail() { $("listView").classList.add("hidden"); $("detailView").classList.remove("hidden"); renderFields(); }
  window.showListView = () => { $("detailView").classList.add("hidden"); $("listView").classList.remove("hidden"); renderOverview(); };
  window.showPreviousTicket = () => { current = (current + tickets.length - 1) % tickets.length; renderFields(); };
  window.showNextTicket = () => { current = (current + 1) % tickets.length; renderFields(); };
  window.editCurrentTicketFields = () => { $("ticketStaticView").classList.add("hidden"); $("ticketEditView").classList.remove("hidden"); };
  window.saveCurrentTicket = () => { saved = true; ticket().status = "DRAFT"; $("saveStatus").textContent = "Saved in local preview memory only."; $("saveStatus").className = "save-status success"; setStatus(ticket()); };
  window.approveCurrentTicket = () => { ticket().status = "APPROVED"; saved = true; $("saveStatus").textContent = "Approved in local preview memory only."; $("saveStatus").className = "save-status success"; $("ticketEditView").classList.add("hidden"); $("ticketStaticView").classList.remove("hidden"); setStatus(ticket()); };
  window.returnCurrentTicketToDraft = () => { ticket().status = "DRAFT"; setStatus(ticket()); };
  window.applySharedFieldsToAllTickets = () => alert("Local preview: Batch is a harmless no-op.");
  window.removeCurrentTicketFromBatch = () => alert("Local preview: Remove from Batch is a harmless no-op.");
  window.createBatchFromSelected = window.addSelectedTicketsToExistingBatch = () => alert("Local preview: batch action is a harmless no-op.");
  window.approveSelectedTickets = window.clearSelectedTickets = window.togglePreviousBatches = () => {};
  window.setOverviewReviewer = () => {};
  window.toggleReplaceScanPanel = () => $("replaceScanPanel").classList.toggle("hidden");
  window.replaceCurrentTicketScan = () => { $("replaceScanStatus").textContent = "Local preview: replacement scan is not uploaded."; };
  window.openScanReviewWindow = () => alert("Local preview: scan review window is unavailable.");
  window.activateScanWheelZoom = () => {};
  window.rotateScanPreview = (degrees) => { const label = $("scanRotationLabel"); label.textContent = `${(parseInt(label.textContent, 10) + degrees + 360) % 360}°`; };
  window.resetScanRotation = () => text("scanRotationLabel", "0°");
  window.addEventListener("DOMContentLoaded", () => {
    populateChoices();
    renderOverview();
    const scan = $("scanFrame");
    if (scan) scan.src = "data:text/html;charset=utf-8," + encodeURIComponent(`<!doctype html><html><head><style>html,body{margin:0;min-height:100%;background:#eef2f7;font-family:Arial,sans-serif;color:#172033}.ticket{width:78%;max-width:320px;margin:24px auto;background:#fff;border:1px solid #cfd9e8;box-shadow:0 2px 8px #0b1d331f;padding:18px 16px;box-sizing:border-box}.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #172033;padding-bottom:10px}.brand{font-size:18px;font-weight:bold;letter-spacing:.08em}.fake{font-size:9px;color:#526178;text-transform:uppercase}.title{font-size:13px;font-weight:bold;margin:14px 0 8px}.line{display:flex;justify-content:space-between;border-bottom:1px dashed #cfd9e8;padding:5px 0;font-size:11px}.line strong{font-size:10px;color:#526178;text-transform:uppercase}.total{display:flex;justify-content:space-between;margin-top:14px;padding-top:9px;border-top:2px solid #172033;font-weight:bold;font-size:13px}.stamp{margin-top:18px;padding:7px;border:1px solid #007c89;color:#007c89;text-align:center;font-size:10px;font-weight:bold;letter-spacing:.08em}</style></head><body><div class="ticket"><div class="top"><div class="brand">DIANE 2.0</div><div class="fake">SYNTHETIC PREVIEW</div></div><div class="title">TRUCKING DELIVERY TICKET</div><div class="line"><strong>Ticket #</strong><span>DEMO-1001</span></div><div class="line"><strong>Date</strong><span>2026-08-07</span></div><div class="line"><strong>Broker</strong><span>DEMO</span></div><div class="line"><strong>Material</strong><span>Demo Material</span></div><div class="line"><strong>Origin</strong><span>Demo Quarry</span></div><div class="line"><strong>Destination</strong><span>Demo Site</span></div><div class="line"><strong>Quantity</strong><span>25.50</span></div><div class="total"><span>PREVIEW TOTAL</span><span>$306.00</span></div><div class="stamp">NOT A REAL TICKET</div></div></body></html>`);
  });
})();
