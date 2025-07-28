// orders.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getDatabase, ref, onValue, update, get } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAL6BpwuISkU12T3stp6bemVgt6CL0GMPk",
  authDomain: "linvaro-shop.firebaseapp.com",
  databaseURL: "https://linvaro-shop-default-rtdb.firebaseio.com/",
  projectId: "linvaro-shop",
  storageBucket: "linvaro-shop.appspot.com",
  messagingSenderId: "1088432356268",
  appId: "1:1088432356268:web:24523319f1928c1a395809",
  measurementId: "G-90599SM75H"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const ordersTableBody = document.getElementById('ordersTableBody');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');

const statusCycle = ['pending', 'processing', 'delivery on way', 'delivered'];

let ordersCache = [];

function formatDate(isoString) {
  if (!isoString) return "N/A";
  const d = new Date(isoString);
  return d.toLocaleString();
}

function formatAddress(order) {
  const houseNumber = order.houseNumber || order.streetNumber || "";
  const streetName = order.streetName || "";
  const suburb = order.suburb || "";
  const province = order.province || "";
  const postalCode = order.postalCode || "";

  const parts = [houseNumber, streetName, suburb, province, postalCode].filter(Boolean);
  return parts.length ? parts.join(", ") : "No address provided";
}

function renderOrders(orders) {
  if (!orders.length) {
    ordersTableBody.innerHTML = `<tr><td colspan="6">No matching orders found.</td></tr>`;
    return;
  }

  let html = '';

  for (const order of orders) {
    let status = (order.status || 'pending').toLowerCase();
    if (!statusCycle.includes(status)) status = 'pending';

    const orderName = `${order.firstName || ''} ${order.lastName || ''}`.trim() || 'Unknown';
    const items = Array.isArray(order.items)
      ? order.items.map(item => `${item.name} (x${item.quantity})`).join(', ')
      : (typeof order.items === 'string' ? order.items : 'No items');

    let total = 0;
    if (typeof order.total === 'number') total = order.total;
    else if (typeof order.total === 'string') total = parseFloat(order.total.replace(/[^\d.-]/g, '')) || 0;

    const date = formatDate(order.timestamp);
    const address = formatAddress(order);

    html += `
      <tr class="order-row" data-key="${order.key}" tabindex="0" aria-expanded="false" aria-controls="details-${order.key}">
        <td>#${order.orderId}</td>
        <td>${orderName}</td>
        <td>
          <span class="status ${status}" data-status="${status}" title="Click to change status" tabindex="0">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
        </td>
        <td>${items}</td>
        <td>R${total.toFixed(2)}</td>
        <td>${date}</td>
      </tr>
      <tr class="details-row" id="details-${order.key}" hidden>
        <td colspan="6" class="details-cell">
          <strong>Customer Details:</strong><br/>
          Email: ${order.email || 'N/A'}<br/>
          Address: ${address}<br/>
          Phone: ${order.phonenumber || order.number || order.Number || 'N/A'}<br/>
          <br/>
          <strong>Order Items:</strong><br/>
          <ul>
            ${
              Array.isArray(order.items)
                ? order.items.map(item => `<li>${item.name} x${item.quantity} - R${item.price?.toFixed(2) || 'N/A'}</li>`).join('')
                : `<li>${order.items || 'No items'}</li>`
            }
          </ul>
          <strong>Order Timestamp:</strong> ${date}<br/>
          <strong>Status History:</strong><br/>
          <ul>
            ${
              Array.isArray(order.statusHistory)
                ? order.statusHistory.map(sh => `<li>${sh.status.charAt(0).toUpperCase() + sh.status.slice(1)} at ${new Date(sh.timestamp).toLocaleString()}</li>`).join('')
                : `<li>No status history</li>`
            }
          </ul>
        </td>
      </tr>
    `;
  }

  ordersTableBody.innerHTML = html;

  document.querySelectorAll('#ordersTableBody .status').forEach(el => {
    el.addEventListener('click', async e => {
      e.stopPropagation();
      const span = e.target;
      const tr = span.closest('tr');
      const key = tr.getAttribute('data-key');
      let currentStatus = span.dataset.status;

      const currentIndex = statusCycle.indexOf(currentStatus);
      const nextIndex = (currentIndex + 1) % statusCycle.length;
      const nextStatus = statusCycle[nextIndex];

      if (nextStatus === 'delivered') {
        const confirmed = confirm("Are you sure this order has been delivered?");
        if (!confirmed) return;
      }

      try {
        const orderRef = ref(db, `orders/${key}`);
        const snapshot = await get(orderRef);
        const orderData = snapshot.val() || {};
        let statusHistory = orderData.statusHistory || [];

        statusHistory.push({ status: nextStatus, timestamp: Date.now() });

        await update(orderRef, { status: nextStatus, statusHistory });

        span.textContent = nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1);
        span.dataset.status = nextStatus;
        span.className = `status ${nextStatus}`;
      } catch (error) {
        alert('Failed to update order status.');
        console.error(error);
      }
    });
  });

  document.querySelectorAll('.order-row').forEach(row => {
    row.addEventListener('click', () => toggleDetails(row));
    row.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleDetails(row);
      }
    });
  });
}

function toggleDetails(row) {
  const key = row.getAttribute('data-key');
  const detailsRow = document.getElementById(`details-${key}`);
  const isHidden = detailsRow.hasAttribute('hidden');

  if (isHidden) {
    detailsRow.removeAttribute('hidden');
    row.setAttribute('aria-expanded', 'true');
  } else {
    detailsRow.setAttribute('hidden', '');
    row.setAttribute('aria-expanded', 'false');
  }
}

function applyFilters() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const statusTerm = statusFilter.value.toLowerCase();

  const filtered = ordersCache.filter(order => {
    const orderId = (order.orderId || '').toLowerCase();
    const name = `${order.firstName || ''} ${order.lastName || ''}`.toLowerCase();
    const status = (order.status || '').toLowerCase();

    const matchesSearch =
      orderId.includes(searchTerm) ||
      name.includes(searchTerm) ||
      status.includes(searchTerm);

    const matchesStatus = !statusTerm || status === statusTerm;

    return matchesSearch && matchesStatus;
  });

  renderOrders(filtered);
}

const ordersRef = ref(db, 'orders');
onValue(ordersRef, snapshot => {
  const data = snapshot.val() || {};
  ordersCache = Object.entries(data).map(([key, val]) => ({ key, ...val }));
  renderOrders(ordersCache);
});

searchInput.addEventListener('input', applyFilters);
statusFilter.addEventListener('change', applyFilters);
