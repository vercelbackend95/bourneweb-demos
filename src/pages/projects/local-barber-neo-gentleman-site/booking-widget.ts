import flatpickr from "flatpickr";

function boot() {
  const widgets = document.querySelectorAll<HTMLElement>("[data-bm-book-widget]");
  console.log("[booking] boot, widgets:", widgets.length);

  widgets.forEach((root) => {
    if (root.dataset.bmInited === "1") return;
    root.dataset.bmInited = "1";

    const track = root.querySelector<HTMLElement>("[data-bm-track]");
    const dateBtn = root.querySelector<HTMLButtonElement>("[data-bm-date-open]");
    const dateInput = root.querySelector<HTMLInputElement>("[data-bm-date]");

    if (!track || !dateBtn || !dateInput) {
      console.warn("[booking] missing required nodes", { track, dateBtn, dateInput });
      return;
    }

    // build times (simple first — if this shows, everything else is alive)
    const times = ["15:00","15:15","15:30","15:45","16:00","16:15","16:30","16:45","17:00"];
    track.innerHTML = "";
    times.forEach((t) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "bm-timeChip";
      b.innerHTML = `<span class="bm-timeChip__time">${t}</span><span class="bm-timeChip__sub">Ends at —</span>`;
      track.appendChild(b);
    });
    console.log("[booking] times rendered:", times.length);

    // flatpickr
    const fp = flatpickr(dateInput, {
      defaultDate: new Date(),
      minDate: "today",
      dateFormat: "d M Y",
      disableMobile: true,
      onOpen: () => console.log("[booking] flatpickr open"),
      onChange: (d) => console.log("[booking] date change", d?.[0]),
    });

    dateBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("[booking] date button click -> open()");
      fp.open();
    });
  });
}

document.addEventListener("astro:page-load", boot);
boot();
