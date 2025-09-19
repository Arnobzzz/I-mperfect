// Supabase + BKash config with your values
const SUPABASE_URL = "https://fgvbbjvcpsnoiebvcqqe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZndmJianZjcHNob2llYnZjcXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNjEwNTAsImV4cCI6MjA3MzgzNzA1MH0.ieQmz3FgG3ZfnltgUczcxdBSVRPCtJU2GYC9qdSVjvY";
const BKASH_NUMBER = "01860066158";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let cart = [];

function loadCart() {
  const data = localStorage.getItem("imperfect_cart");
  if (data) cart = JSON.parse(data);
  else cart = [];
}

function saveCart() {
  localStorage.setItem("imperfect_cart", JSON.stringify(cart));
}

async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*");
  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }
  return data;
}

async function renderProducts() {
  const grid = document.getElementById("product-grid");
  if (!grid) return;
  const products = await fetchProducts();
  grid.innerHTML = "";
  products.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <img src="${p.image_url}" alt="${p.name}">
      <h4>${p.name}</h4>
      <p class="price">৳ ${p.price}</p>
      <button onclick="addToCart(${p.id})">Add to Cart</button>
    `;
    grid.appendChild(card);
  });
}

async function renderFeatured() {
  const grid = document.getElementById("featured-products");
  if (!grid) return;
  const products = await fetchProducts();
  const featured = products.slice(0, 2);
  grid.innerHTML = "";
  featured.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <img src="${p.image_url}" alt="${p.name}">
      <h4>${p.name}</h4>
      <p class="price">৳ ${p.price}</p>
      <button onclick="addToCart(${p.id})">Add to Cart</button>
    `;
    grid.appendChild(card);
  });
}

function addToCart(id) {
  const found = cart.find(item => item.id === id);
  if (found) found.qty++;
  else cart.push({ id: id, qty: 1 });
  saveCart();
  alert("Added to cart");
}

async function renderCart() {
  loadCart();
  const container = document.getElementById("cart-items");
  const summary = document.getElementById("cart-summary");
  if (!container || !summary) return;
  container.innerHTML = "";
  let total = 0;
  for (const item of cart) {
    const { data, error } = await supabase
      .from("products")
      .select("price", "name")
      .eq("id", item.id)
      .single();
    if (error || !data) continue;
    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <div class="item-info">
        <h4>${data.name} (${item.qty})</h4>
        <span>৳ ${data.price}</span>
      </div>
      <div class="item-actions">
        <button onclick="removeFromCart(${item.id})">Remove</button>
      </div>
    `;
    container.appendChild(div);
    total += data.price * item.qty;
  }
  summary.innerText = `Total: ৳ ${total}`;
}

function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  saveCart();
  renderCart();
}

async function confirmPayment() {
  const txidEl = document.getElementById("bkash-txid");
  const txid = txidEl ? txidEl.value.trim() : "";
  if (!txid) {
    alert("Please enter transaction ID");
    return;
  }
  loadCart();
  if (cart.length === 0) {
    alert("Cart is empty");
    return;
  }
  let amount = 0;
  for (const item of cart) {
    const { data, error } = await supabase
      .from("products")
      .select("price")
      .eq("id", item.id)
      .single();
    if (!error && data) amount += data.price * item.qty;
  }
  const { data, error } = await supabase
    .from("orders")
    .insert([
      {
        txid: txid,
        items: JSON.stringify(cart),
        amount: amount
      }
    ]);
  if (error) {
    console.error("Error saving order:", error);
    alert("Error placing order");
    return;
  }
  alert("Order placed! Thank you.");
  cart = [];
  saveCart();
  window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
  loadCart();
  const path = window.location.pathname;
  if (path.endsWith("products.html")) {
    renderProducts();
  } else if (path.endsWith("checkout.html")) {
    renderCart();
    const btn = document.getElementById("confirm-payment");
    if (btn) btn.addEventListener("click", confirmPayment);
  } else {
    renderFeatured();
  }
});
