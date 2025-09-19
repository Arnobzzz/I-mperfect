// js/main.js

const SUPABASE_URL = "https://fgvbbjvcpsnoiebvcqqe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZndmJianZjcHNob2llYnZjcXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNjEwNTAsImV4cCI6MjA3MzgzNzA1MH0.ieQmz3FgG3ZfnltgUczcxdBSVRPCtJU2GYC9qdSVjvY";
const BKASH_NUMBER = "01860066158";

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let cart = [];

// Load cart from localStorage
function loadCart() {
  const data = localStorage.getItem("imperfect_cart");
  if (data) cart = JSON.parse(data);
  else cart = [];
}

// Save cart to localStorage
function saveCart() {
  localStorage.setItem("imperfect_cart", JSON.stringify(cart));
}

// Fetch all products
async function fetchProducts() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*");
  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }
  return data;
}

// Render all products on products.html
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
      <div class="product-buttons">
        <button onclick="addToCart(${p.id})">Add to Cart</button>
        <button onclick="viewProduct(${p.id})">View</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

// Render featured on home page
async function renderFeatured() {
  const grid = document.getElementById("featured-products");
  if (!grid) return;
  const products = await fetchProducts();
  const featured = products.slice(0, 4);  // first 4 as featured
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

// Add to cart (or increase quantity)
function addToCart(id) {
  const found = cart.find(item => item.id === id);
  if (found) {
    found.qty += 1;
  } else {
    cart.push({ id: id, qty: 1 });
  }
  saveCart();
  alert("Added to cart");
}

// Remove item
function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  saveCart();
  renderCart();  // refresh cart display
}

// Change quantity
function changeQuantity(id, newQty) {
  const found = cart.find(item => item.id === id);
  if (!found) return;
  if (newQty <= 0) {
    removeFromCart(id);
  } else {
    found.qty = newQty;
  }
  saveCart();
  renderCart();
}

// Render cart on checkout page
async function renderCart() {
  loadCart();
  const container = document.getElementById("cart-items");
  const summary = document.getElementById("cart-summary");
  if (!container || !summary) return;
  container.innerHTML = "";
  let total = 0;

  for (const item of cart) {
    // fetch product details
    const { data: prod, error } = await supabaseClient
      .from("products")
      .select("name, price, image_url")
      .eq("id", item.id)
      .single();
    if (error || !prod) {
      console.error("Error fetching product for cart:", error);
      continue;
    }

    const itemTotal = prod.price * item.qty;
    total += itemTotal;

    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <img src="${prod.image_url}" alt="${prod.name}">
      <div class="item-details">
        <h4>${prod.name}</h4>
        <span>৳ ${prod.price}</span>
      </div>
      <div class="item-actions">
        <input type="number" class="quantity" value="${item.qty}" min="1" onchange="changeQuantity(${item.id}, this.value)">
        <button class="remove" onclick="removeFromCart(${item.id})">Remove</button>
      </div>
      <div class="item-total">৳ ${itemTotal}</div>
    `;
    container.appendChild(div);
  }

  summary.innerHTML = `Total: ৳ ${total}`;
}

// Handle order form submit
async function confirmOrder(event) {
  event.preventDefault();

  const name = document.getElementById("customer-name").value.trim();
  const email = document.getElementById("customer-email").value.trim();
  const phone = document.getElementById("customer-phone").value.trim();
  const address = document.getElementById("customer-address").value.trim();
  const txid = document.getElementById("bkash-txid").value.trim();

  if (!name || !email || !phone || !address || !txid) {
    alert("Please fill all fields");
    return;
  }

  loadCart();
  if (cart.length === 0) {
    alert("Cart is empty");
    return;
  }

  let totalAmount = 0;
  const itemsData = [];

  for (const item of cart) {
    const { data: prod, error } = await supabaseClient
      .from("products")
      .select("name, price, image_url")
      .eq("id", item.id)
      .single();
    if (error || !prod) {
      console.error("Error getting product in order loop:", error);
      alert("Error with product info");
      return;
    }
    totalAmount += prod.price * item.qty;
    itemsData.push({
      product_id: item.id,
      product_name: prod.name,
      product_image: prod.image_url,
      quantity: item.qty,
      price_each: prod.price
    });
  }

  // Insert into orders
  const { data: orderResult, error: orderErr } = await supabaseClient
    .from("orders")
    .insert([
      {
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        customer_address: address,
        txid: txid,
        amount: totalAmount,
        created_at: new Date().toISOString()
      }
    ])
    .select();
  if (orderErr) {
    console.error("Error creating order:", orderErr);
    alert("Could not place order");
    return;
  }

  const order = orderResult[0];

  // Insert order items
  const { error: itemsErr } = await supabaseClient
    .from("order_items")
    .insert(
      itemsData.map(it => ({
        order_id: order.id,
        product_id: it.product_id,
        product_name: it.product_name,
        product_image: it.product_image,
        quantity: it.quantity,
        price_each: it.price_each
      }))
    );
  if (itemsErr) {
    console.error("Error inserting order items:", itemsErr);
    alert("Could not save order items");
    return;
  }

  // clear cart
  cart = [];
  saveCart();

  // redirect to success
  window.location.href = `order-success.html?order_id=${order.id}`;
}

// Search products (optional)
async function searchProducts(query) {
  if (!query) {
    renderProducts();
    return;
  }
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .ilike("name", `%${query}%`);
  if (error) {
    console.error("Error searching products:", error);
    return;
  }
  const grid = document.getElementById("product-grid");
  if (!grid) return;
  grid.innerHTML = "";
  data.forEach(p => {
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

function viewProduct(id) {
  // if you implement product.html with details, redirect or load detail
  alert("Product detail page not implemented yet.");
}

document.addEventListener("DOMContentLoaded", () => {
  loadCart();
  const path = window.location.pathname;

  if (path.endsWith("products.html")) {
    renderProducts();
    // search
    const btn = document.getElementById("search-button");
    const input = document.getElementById("search-input");
    if (btn && input) {
      btn.addEventListener("click", () => searchProducts(input.value));
    }
  }
  else if (path.endsWith("checkout.html")) {
    renderCart();
    const form = document.getElementById("order-form");
    if (form) {
      form.addEventListener("submit", confirmOrder);
    }
  }
  else if (path.endsWith("order-success.html")) {
    // nothing special, order-id handled in HTML
  }
  else {
    // home page
    renderFeatured();
  }
});
