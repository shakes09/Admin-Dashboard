import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

// Firebase config
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth();

// 🔒 Protect dashboard with auth check
onAuthStateChanged(auth, user => {
  const allowedEmails = ["linvaroleather@gmail.com", "shakesmofokeng88@gmail.com"];
  if (!user || !user.emailVerified || !allowedEmails.includes(user.email.toLowerCase())) {
    window.location.href = "login.html";
  } else {
    // Optional: store logged in user
    localStorage.setItem("loggedInUser", JSON.stringify({
      name: user.displayName || user.email,
      email: user.email
    }));
  }
});

// --- Chart Section ---
let chartInstance;
let fullData = {};

function createChart(mode = "revenue") {
  const container = document.getElementById("chartContainer");
  container.innerHTML = '';
  const canvas = document.createElement("canvas");
  container.appendChild(canvas);

  const labels = Object.keys(fullData);
  const data = labels.map(day => mode === "revenue" ? fullData[day].revenue : fullData[day].orders);

  const label = mode === "revenue" ? "Sales (R)" : "Order Count";
  const color = mode === "revenue" ? "#3498db" : "#2ecc71";

  chartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label,
        data,
        fill: true,
        borderColor: color,
        backgroundColor: `${color}33`,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function loadSalesData() {
  const ordersRef = ref(db, "orders");
  onValue(ordersRef, snapshot => {
    const data = snapshot.val() || {};
    const grouped = {};

    Object.values(data).forEach(order => {
      const date = new Date(order.timestamp || Date.now());
      const day = date.toISOString().split('T')[0];
      const total = parseFloat(order.total) || 0;

      if (!grouped[day]) grouped[day] = { revenue: 0, orders: 0 };
      grouped[day].revenue += total;
      grouped[day].orders += 1;
    });

    const sorted = Object.entries(grouped)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .slice(-7);

    fullData = Object.fromEntries(sorted);
    const mode = document.getElementById("chartToggle").value;
    if (chartInstance) chartInstance.destroy();
    createChart(mode);
  });
}

document.getElementById("chartToggle").addEventListener("change", () => {
  const mode = document.getElementById("chartToggle").value;
  if (chartInstance) chartInstance.destroy();
  createChart(mode);
});

loadSalesData();

// --- Orders & Products Section ---
const ordersCountEl = document.getElementById('ordersCount');
const productsCountEl = document.getElementById('productsCount');
const totalSalesEl = document.getElementById('totalSales');
const ordersTableBody = document.getElementById('ordersTableBody');

function generateOrderID(prefixes = ['LIN', 'VARO']) {
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${randomNum}`;
}

function formatDate(isoString) {
  if (!isoString) return "N/A";
  const d = new Date(isoString);
  return d.toLocaleString();
}

const statusCycle = ['pending', 'processing', 'delivery on way', 'delivered'];

const ordersRef = ref(db, 'orders');
onValue(ordersRef, async (snapshot) => {
  const ordersData = snapshot.val();

  if (!ordersData) {
    ordersCountEl.textContent = '0';
    totalSalesEl.textContent = 'R0.00';
    ordersTableBody.innerHTML = '<tr><td colspan="6">No orders found</td></tr>';
    return;
  }

  const orders = Object.entries(ordersData).map(([key, order]) => ({ key, ...order }));
  orders.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

  let totalSales = 0;
  let updatesNeeded = false;
  const updates = {};
  let rowsHtml = '';

  for (const order of orders) {
    if (!order.orderId) {
      const newId = generateOrderID();
      updates[`${order.key}/orderId`] = newId;
      order.orderId = newId;
      updatesNeeded = true;
    }

    const orderName = `${order.firstName || ''} ${order.lastName || ''}`.trim() || 'Unknown';
    let status = (order.status || 'pending').toLowerCase();
    if (!statusCycle.includes(status)) status = 'pending';

    const items = Array.isArray(order.items)
      ? order.items.map(item => `${item.name} (x${item.quantity})`).join(', ')
      : (typeof order.items === 'string' ? order.items : 'No items');

    let total = 0;
    if (typeof order.total === 'number') {
      total = order.total;
    } else if (typeof order.total === 'string') {
      total = parseFloat(order.total.replace(/[^\d.-]/g, '')) || 0;
    }
    totalSales += total;

    const date = formatDate(order.timestamp);

    rowsHtml += `
      <tr data-key="${order.key}">
        <td>#${order.orderId}</td>
        <td>${orderName}</td>
        <td>
          <span class="status ${status}" style="cursor:pointer" title="Click to change status">${order.status || 'Pending'}</span>
        </td>
        <td>${items}</td>
        <td>R${total.toFixed(2)}</td>
        <td>${date}</td>
      </tr>
    `;
  }

  if (updatesNeeded) {
    await update(ref(db, 'orders'), updates);
  }

  ordersCountEl.textContent = orders.length;
  totalSalesEl.textContent = `R${totalSales.toFixed(2)}`;
  ordersTableBody.innerHTML = rowsHtml;

  document.querySelectorAll('#ordersTableBody .status').forEach(span => {
    span.addEventListener('click', async (e) => {
      const tr = e.target.closest('tr');
      if (!tr) return;

      const key = tr.getAttribute('data-key');
      if (!key) return;

      let currentStatus = e.target.textContent.toLowerCase();
      if (!statusCycle.includes(currentStatus)) currentStatus = 'pending';

      const currentIndex = statusCycle.indexOf(currentStatus);
      const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];

      try {
        await update(ref(db, `orders/${key}`), { status: nextStatus });
        e.target.textContent = nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1);
        e.target.className = `status ${nextStatus}`;
      } catch (error) {
        console.error('Error updating status:', error);
        alert('Failed to update order status. Try again.');
      }
    });
  });
});

// Load product count
const productsRef = ref(db, 'products');
onValue(productsRef, (snapshot) => {
  const data = snapshot.val();
  productsCountEl.textContent = data ? Object.keys(data).length : '0';
});
