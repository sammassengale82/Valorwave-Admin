// /cms/sections/pricing.js
import { el, bindInput, ensure, setDirty } from "../state.js";

export function build(CURRENT) {
  const pr = ensure(CURRENT, "home.pricing", {
    title: "",
    subtitle: "",
    plans: []
  });

  if (!Array.isArray(pr.plans)) pr.plans = [];

  const wrap = el("div");

  // -----------------------------
  // Section Title
  // -----------------------------
  wrap.appendChild(el("label", {}, "Pricing Section Title"));
  const title = el("input", { type: "text" });
  bindInput(title, pr, "title");
  wrap.appendChild(title);

  // -----------------------------
  // Subtitle
  // -----------------------------
  wrap.appendChild(el("label", {}, "Subtitle (optional)"));
  const subtitle = el("input", { type: "text" });
  bindInput(subtitle, pr, "subtitle");
  wrap.appendChild(subtitle);

  // -----------------------------
  // Add Plan Button
  // -----------------------------
  const addBtn = el("button", { class: "btn primary" }, "Add Pricing Plan");
  addBtn.addEventListener("click", () => {
    pr.plans.push({
      name: "",
      price: "",
      description: "",
      features: []
    });
    setDirty(true);
    rerender();
  });
  wrap.appendChild(addBtn);

  // -----------------------------
  // Plans List
  // -----------------------------
  const list = el("div");
  wrap.appendChild(list);

  function rerender() {
    list.innerHTML = "";

    pr.plans.forEach((plan, i) => {
      const card = el("div", { class: "card" });

      // Plan Name
      card.appendChild(el("label", {}, "Plan Name"));
      const name = el("input", { type: "text" });
      bindInput(name, plan, "name");
      card.appendChild(name);

      // Price
      card.appendChild(el("label", {}, "Price (e.g., '$499', 'Starting at $999')"));
      const price = el("input", { type: "text" });
      bindInput(price, plan, "price");
      card.appendChild(price);

      // Description
      card.appendChild(el("label", {}, "Short Description"));
      const desc = el("textarea");
      bindInput(desc, plan, "description");
      card.appendChild(desc);

      // Add Feature Button
      const addFeature = el("button", { class: "btn secondary" }, "Add Feature");
      addFeature.addEventListener("click", () => {
        plan.features.push("");
        setDirty(true);
        rerender();
      });
      card.appendChild(addFeature);

      // Features List
      const featureList = el("div");
      card.appendChild(featureList);

      plan.features.forEach((feat, j) => {
        const fCard = el("div", { class: "subcard" });

        const fInput = el("input", { type: "text" });
        bindInput(fInput, plan.features, j);
        fCard.appendChild(fInput);

        const removeFeature = el("button", { class: "btn danger" }, "Remove Feature");
        removeFeature.addEventListener("click", () => {
          plan.features.splice(j, 1);
          setDirty(true);
          rerender();
        });
        fCard.appendChild(removeFeature);

        featureList.appendChild(fCard);
      });

      // Remove Plan
      const removePlan = el("button", { class: "btn danger" }, "Remove Plan");
      removePlan.addEventListener("click", () => {
        pr.plans.splice(i, 1);
        setDirty(true);
        rerender();
      });
      card.appendChild(removePlan);

      list.appendChild(card);
    });
  }

  rerender();
  return wrap;
}
