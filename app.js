// =====================
//  GI DATA (তুমি বাড়াবে)
//  NOTE: key অবশ্যই district name এর সাথে match করবে
// =====================
const GI_DATA = {
  "Dhaka": {
    giProduct: "জামদানি",
    story: "ঢাকার জামদানি বাংলাদেশের ঐতিহ্যবাহী বস্ত্রশিল্প..."
  },
  "Rajshahi": {
    giProduct: "রাজশাহী সিল্ক",
    story: "রাজশাহীর রেশম শিল্প বহু পুরোনো..."
  }
};

// =====================
//  UI Elements
// =====================
const mapHost = document.getElementById("mapHost");
const loading = document.getElementById("loading");
const districtTitle = document.getElementById("districtTitle");
const giTitle = document.getElementById("giTitle");
const giStory = document.getElementById("giStory");
const toggleLabels = document.getElementById("toggleLabels");
const resetBtn = document.getElementById("resetBtn");

// =====================
//  Helpers
// =====================
function norm(s){ return (s || "").trim(); }

function setInfo(districtName){
  const key = norm(districtName);
  districtTitle.textContent = key || "—";

  const info = GI_DATA[key];
  if(info){
    giTitle.textContent = info.giProduct || "GI product";
    giStory.textContent = info.story || "";
  }else{
    giTitle.textContent = "GI data not added";
    giStory.textContent = "এই জেলার GI তথ্য এখনো যোগ করা হয়নি";
  }
}

function clearActive(svg){
  svg.querySelectorAll("path.active").forEach(p => p.classList.remove("active"));
}

// ✅ IMPORTANT: এখানে থেকেই আসল জেলা নাম বের হবে
function getDistrictName(path){
  // 1) attributes (কখনো থাকে)
  let name =
    path.getAttribute("data-name") ||
    path.getAttribute("data-district") ||
    path.getAttribute("name");

  // 2) <title> (geoBoundaries / mapshaper এ অনেক সময় থাকে)
  if(!name){
    const t = path.querySelector("title");
    if(t && t.textContent) name = t.textContent;
  }

  // 3) <metadata> fallback
  if(!name){
    const md = path.querySelector("metadata");
    if(md && md.textContent) name = md.textContent;
  }

  // 4) last fallback (id = d36 টাইপ হলে এটা দেখাবে, কিন্তু সাধারণত উপরেরগুলো কাজ করবে)
  if(!name) name = path.getAttribute("id");

  return norm(name);
}

// =====================
//  Label builder
// =====================
function ensureLabelLayer(svg){
  let layer = svg.querySelector("#labelLayer");
  if(!layer){
    layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    layer.setAttribute("id", "labelLayer");
    svg.appendChild(layer);
  }
  return layer;
}

function buildLabels(svg, paths){
  const labelLayer = ensureLabelLayer(svg);
  labelLayer.innerHTML = "";

  paths.forEach(p => {
    const district = getDistrictName(p);
    if(!district) return;

    const bb = p.getBBox();
    // খুব ছোট island/river chunk এ লেবেল না
    if(bb.width < 10 || bb.height < 10) return;

    const x = bb.x + bb.width / 2;
    const y = bb.y + bb.height / 2;

    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", x);
    t.setAttribute("y", y);
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("dominant-baseline", "middle");
    t.classList.add("district-label");
    t.textContent = district;

    labelLayer.appendChild(t);
  });

  return labelLayer;
}

// =====================
//  Load SVG + Wire events
// =====================
async function loadMap(){
  try{
    const res = await fetch("./geoBoundaries-BGD-ADM2.svg");
    if(!res.ok) throw new Error("SVG file not found. Ensure geoBoundaries-BGD-ADM2.svg is in same folder.");

    const svgText = await res.text();
    mapHost.innerHTML = svgText;
    loading?.remove();

    const svg = mapHost.querySelector("svg");
    if(!svg) throw new Error("No <svg> found inside loaded file.");

    // viewBox ensure
    if(!svg.getAttribute("viewBox")){
      const w = svg.getAttribute("width") || 800;
      const h = svg.getAttribute("height") || 1000;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      svg.removeAttribute("width");
      svg.removeAttribute("height");
    }

    // collect paths
    const paths = svg.querySelectorAll("path");

    // make sure each has id
    paths.forEach((p, i) => {
      if(!p.getAttribute("id")) p.setAttribute("id", `d${i+1}`);
    });

    // Labels (hidden by default)
    const labelLayer = buildLabels(svg, paths);
    labelLayer.style.display = "none";

    toggleLabels.addEventListener("change", () => {
      labelLayer.style.display = toggleLabels.checked ? "block" : "none";
    });

    // click + hover
    paths.forEach(p => {
      p.addEventListener("click", () => {
        clearActive(svg);
        p.classList.add("active");
        setInfo(getDistrictName(p));
      });

      p.addEventListener("mouseenter", () => {
        // hover এ শুধু নাম দেখাই
        const name = getDistrictName(p);
        if(name) districtTitle.textContent = name;
      });
    });

    // Reset
    resetBtn.addEventListener("click", () => {
      clearActive(svg);
      toggleLabels.checked = false;
      labelLayer.style.display = "none";
      districtTitle.textContent = "একটা জেলা সিলেক্ট করো";
      giTitle.textContent = "—";
      giStory.textContent = "জেলার বর্ডারে ক্লিক করলে এখানে তথ্য দেখাবে।";
    });

    // Default text
    setInfo("");

    // Debug: প্রথম 10 টা জেলার নাম কনসোলে দেখবে (চেক করতে)
    console.log("Sample district names:", Array.from(paths).slice(0,10).map(getDistrictName));

  }catch(err){
    mapHost.innerHTML = `<div class="loading">Map load error: ${String(err.message || err)}</div>`;
  }
}

loadMap();
