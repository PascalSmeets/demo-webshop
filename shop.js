const PRODUCTS = {
  apple: { name: "Apple", emoji: "🍏" },
  banana: { name: "Banana", emoji: "🍌" },
  lemon: { name: "Lemon", emoji: "🍋" },
  orange: { name: "Orange", emoji: "🍊" },
};

function getBasket() {
  try {
    const basket = localStorage.getItem("basket");
    if (!basket) return [];
    const parsed = JSON.parse(basket);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Error parsing basket from localStorage:", error);
    return [];
  }
}

// Track how many free oranges have been granted to the user.
// This prevents auto-removal when apples drop; oranges are only auto-added
// when the apple count crosses thresholds upward.
function getGrantedFreeOranges() {
  const v = parseInt(localStorage.getItem("grantedFreeOranges") || "0", 10);
  return Number.isFinite(v) ? Math.max(0, v) : 0;
}
function setGrantedFreeOranges(n) {
  localStorage.setItem("grantedFreeOranges", String(Math.max(0, Math.floor(n || 0))));
}
function incGrantedFreeOranges(delta = 1) {
  setGrantedFreeOranges(getGrantedFreeOranges() + delta);
}

function addToBasket(product) {
  const basket = getBasket();
  // add requested product
  basket.push(product);
  // compute how many free oranges should be present based on apples
  // We only auto-add oranges when crossing thresholds upward; we do NOT
  // auto-remove oranges when apples drop. The number of already granted
  // free oranges is tracked in `grantedFreeOranges` in localStorage.
  const appleCount = basket.filter((p) => p === "apple").length;
  const desiredTotalFreeOranges = Math.floor(appleCount / 4);
  const granted = getGrantedFreeOranges();

  if (desiredTotalFreeOranges > granted) {
    // add newly earned free oranges
    const toAdd = desiredTotalFreeOranges - granted;
    for (let i = 0; i < toAdd; i++) {
      basket.push("orange");
    }
    setGrantedFreeOranges(desiredTotalFreeOranges);
  }

  localStorage.setItem("basket", JSON.stringify(basket));
}

// Remove a single item by array index and resync free oranges
function removeFromBasket(index) {
  const basket = getBasket();
  if (index < 0 || index >= basket.length) return;
  const removedItem = basket[index];
  // If user explicitly removes an orange, decrement granted counter so
  // it won't be considered granted anymore. Oranges are only re-added
  // when apples cross thresholds upward (see addToBasket).
  if (removedItem === "orange") {
    const granted = getGrantedFreeOranges();
    setGrantedFreeOranges(Math.max(0, granted - 1));
  }
  basket.splice(index, 1);

  localStorage.setItem("basket", JSON.stringify(basket));
  renderBasket();
  renderBasketIndicator();
}

function clearBasket() {
  localStorage.removeItem("basket");
  // clearing basket should also reset suppressed free oranges
  setGrantedFreeOranges(0);
}

function renderBasket() {
  const basket = getBasket();
  const basketList = document.getElementById("basketList");
  const cartButtonsRow = document.querySelector(".cart-buttons-row");
  if (!basketList) return;
  basketList.innerHTML = "";
  if (basket.length === 0) {
    basketList.innerHTML = "<li>No products in basket.</li>";
    if (cartButtonsRow) cartButtonsRow.style.display = "none";
    return;
  }
  basket.forEach((product, idx) => {
    const item = PRODUCTS[product];
    if (item) {
      const li = document.createElement("li");
      // mark oranges as free in the display
      const displayName = product === "orange" ? `${item.name} (free)` : item.name;
      li.innerHTML = `<span class='basket-emoji'>${item.emoji}</span> <span>${displayName}</span>`;

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-item-btn";
      removeBtn.setAttribute("aria-label", `Remove ${item.name}`);
      removeBtn.textContent = "−";
      removeBtn.onclick = function () {
        removeFromBasket(idx);
      };
      li.appendChild(removeBtn);

      basketList.appendChild(li);
    }
  });
  if (cartButtonsRow) cartButtonsRow.style.display = "flex";
}

function renderBasketIndicator() {
  const basket = getBasket();
  let indicator = document.querySelector(".basket-indicator");
  if (!indicator) {
    const basketLink = document.querySelector(".basket-link");
    if (!basketLink) return;
    indicator = document.createElement("span");
    indicator.className = "basket-indicator";
    basketLink.appendChild(indicator);
  }
  if (basket.length > 0) {
    indicator.textContent = basket.length;
    indicator.style.display = "flex";
  } else {
    indicator.style.display = "none";
  }
}

// Call this on page load and after basket changes
if (document.readyState !== "loading") {
  renderBasketIndicator();
} else {
  document.addEventListener("DOMContentLoaded", renderBasketIndicator);
}

// Patch basket functions to update indicator
const origAddToBasket = window.addToBasket;
window.addToBasket = function (product) {
  origAddToBasket(product);
  renderBasket();
  renderBasketIndicator();
};
const origClearBasket = window.clearBasket;
window.clearBasket = function () {
  origClearBasket();
  renderBasket();
  renderBasketIndicator();
};
