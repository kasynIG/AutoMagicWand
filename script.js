const upload = document.getElementById("upload");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const result = document.getElementById("result");
const shipTypeSelect = document.getElementById("shipType");

upload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      // draw full image
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      // fixed crop coords
      const left = 382, top = 604, width = 325, height = 46;
      const cropData = ctx.getImageData(left, top, width, height);
      canvas.width = width;
      canvas.height = height;
      ctx.putImageData(cropData, 0, 0);
      result.innerHTML = "<p>Reading image…</p>";
      Tesseract.recognize(canvas, "eng", {
        tessedit_char_whitelist: "0123456789/,"
      }).then(({ data: { text } }) => {
        const match = text.replace(/\s/g, "").match(/([\d,]+)\/([\d,]+)/);
        if (match) {
          const used = parseInt(match[1].replace(/,/g, ""), 10);
          const max = parseInt(match[2].replace(/,/g, ""), 10);
          calculateShips(used, max);
        } else {
          result.textContent = "Could not read leadership numbers.";
        }
      });
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

function calculateShips(used, max) {
  const shipCosts = { cruiser: 30, destroyer: 10, frigate: 3 };
  const priority = shipTypeSelect.value;
  const available = max - used - 200;
  if (available < 0) {
    result.innerHTML = "<p>Leadership after deduction is negative.</p>";
    return;
  }
  let bestCombo = null;
  let bestCount = -1;
  // exhaustive search
  for (let c = 0; c <= Math.floor(available / shipCosts.cruiser); c++) {
    for (let d = 0; d <= Math.floor((available - c*shipCosts.cruiser) / shipCosts.destroyer); d++) {
      const rem = available - c*shipCosts.cruiser - d*shipCosts.destroyer;
      if (rem % shipCosts.frigate !== 0) continue;
      const f = rem / shipCosts.frigate;
      const combo = { cruiser: c, destroyer: d, frigate: f };
      if (combo[priority] > bestCount) {
        bestCount = combo[priority];
        bestCombo = combo;
      }
    }
  }
  if (!bestCombo) {
    result.innerHTML = "<p>No valid ship combination found.</p>";
    return;
  }
  const allocated = bestCombo.cruiser * shipCosts.cruiser +
                    bestCombo.destroyer * shipCosts.destroyer +
                    bestCombo.frigate * shipCosts.frigate;
  const leftover = available - allocated;
  result.innerHTML = `
    <p>Detected Used / Max: ${used} / ${max}</p>
    <p>After -200 Deduction: ${available}</p>
    <p>Cruisers: ${bestCombo.cruiser}</p>
    <p>Destroyers: ${bestCombo.destroyer}</p>
    <p>Frigates: ${bestCombo.frigate}</p>
    <p>Leadership Allocated: ${allocated}</p>
    <p>Leftover: ${leftover}</p>
  `;
}
