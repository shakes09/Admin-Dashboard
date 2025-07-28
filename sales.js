// Your Firebase config
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
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Elements
const totalRevenueEl = document.getElementById("totalRevenue");
const totalOrdersEl = document.getElementById("totalOrders");
const recentOrdersEl = document.getElementById("recentOrders");

// Chart setup
let chart;
const ctx = document.getElementById("salesChart").getContext("2d");

function renderChart(data) {
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(data),
      datasets: [{
        label: "Daily Sales (R)",
        data: Object.values(data),
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderRadius: 5,
      }],
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    },
  });
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString();
}

// Fetch and display report from Firebase
db.ref("orders").on("value", (snapshot) => {
  let totalRevenue = 0;
  let totalOrders = 0;
  let salesByDate = {};
  recentOrdersEl.innerHTML = "";

  snapshot.forEach((child) => {
    const order = child.val();

    // Only count orders with status 'delivered' (case-insensitive)
    if (!order.status || order.status.toLowerCase() !== "delivered") return;

    const customer = `${order.firstName || order.firstname || ""} ${order.lastName || order.lastname || ""}`.trim() || "Unknown";
    const product = order.product || "Unknown";

    // Safely parse total amount to avoid NaN
    const amountRaw = order.total;
    const amount = parseFloat(amountRaw);
    const validAmount = isNaN(amount) ? 0 : amount;

    if (isNaN(amount)) {
      console.warn('Invalid total amount for order:', order);
    }

    const date = formatDate(order.timestamp || Date.now());

    totalOrders++;
    totalRevenue += validAmount;

    // Add to sales chart by date
    salesByDate[date] = (salesByDate[date] || 0) + validAmount;

    // Append order to recent orders table
    const row = `
      <tr>
        <td>${customer}</td>
        <td>${product}</td>
        <td>R${validAmount.toFixed(2)}</td>
        <td>${date}</td>
      </tr>
    `;
    recentOrdersEl.innerHTML += row;
  });

  totalRevenueEl.textContent = `R${totalRevenue.toFixed(2)}`;
  totalOrdersEl.textContent = totalOrders;

  renderChart(salesByDate);
});
