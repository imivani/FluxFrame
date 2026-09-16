(() => {
  const site = window.FLUXFRAME_SITE;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const items = window.FLUXFRAME_ITEMS || [];
  const categories = [
    ["all", "All"],
    ["web", "Web Designs"],
    ["crypto", "Startup"],
    ["nft", "NFT"],
    ["thread", "Graphics"],
    ["motion", "Animated Signatures"],
    ["brand", "Branding"]
  ];
  const webDesignOrder = [
    "upvotic-landing",
    "anonymous-hosting-page",
    "rdp-sh-landing",
    "crypto-bot-page",
    "b4u-army-landing",
    "xummtools-landing",
    "projectxl-landing",
    "evl-project-page",
    "netflix-upgrades-page",
    "auction-house-page",
    "securedvpn-landing"
  ];
  const excludedGalleryIds = new Set([
    "fluxframe-mark",
    "fluxframe-contour-cover",
    "fluxframe-wordmark",
    "fluxframe-texture",
    "recent-projects-cover",
    "web-designs-cover"
  ]);

  let activeItems = items;
  let activeIndex = 0;
  let lightboxZoom = 1;
  let lightboxPanX = 0;
  let lightboxPanY = 0;
  let lightboxDrag = null;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const categoryLabel = (category) => {
    const found = categories.find(([key]) => key === category);
    return found ? found[1] : category;
  };

  const escaped = (text) => String(text).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);

  const galleryItems = () => items.filter((item) => !excludedGalleryIds.has(item.id));

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const itemIndexById = (id) => items.findIndex((item) => item.id === id);

  const mediaMarkup = (item, lazy = true) => `
    <div class="project-media" style="--card-image: url('${item.src}')">
      <img
        src="${item.src}"
        alt="${escaped(item.title)}"
        width="${item.width}"
        height="${item.height}"
        ${lazy ? 'loading="lazy"' : 'fetchpriority="high"'}
        decoding="async">
      ${item.animated ? '<span class="animated-flag">GIF</span>' : ""}
    </div>
  `;

  const cardMarkup = (item, index) => `
    <button class="project-card ${item.orientation}" type="button" data-index="${index}" data-category="${item.category}" aria-label="Open ${escaped(item.title)} preview">
      ${mediaMarkup(item)}
      <span class="project-meta">
        <span class="project-meta-top">
          <span>${escaped(item.kind)}</span>
          <span class="category-dot" aria-hidden="true"></span>
        </span>
        <h3>${escaped(item.title)}</h3>
      </span>
    </button>
  `;

  const caseMarkup = (item, index) => `
    <button class="case-row" type="button" data-index="${index}" aria-label="Open ${escaped(item.title)} preview">
      <span class="case-thumb">
        <img src="${item.src}" alt="${escaped(item.title)}" width="${item.width}" height="${item.height}" loading="lazy" decoding="async">
      </span>
      <span class="case-copy">
        <span class="case-tags">
          <span>${escaped(item.kind)}</span>
          <span>${escaped(item.year)}</span>
        </span>
        <h3>${escaped(item.title)}</h3>
        <p>${escaped(item.description)}</p>
      </span>
      <span class="case-action" aria-hidden="true"></span>
    </button>
  `;

  const bindOpeners = (scope = document) => {
    $$("[data-index], [data-open-id]", scope).forEach((button) => {
      if (button.dataset.boundOpener) return;
      button.dataset.boundOpener = "true";
      button.addEventListener("click", () => {
        const index = button.dataset.openId
          ? itemIndexById(button.dataset.openId)
          : Number(button.dataset.index);
        if (index >= 0) openLightbox(index);
      });
      button.addEventListener("pointermove", (event) => {
        if (reducedMotion.matches || !finePointer.matches) return;
        const rect = button.getBoundingClientRect();
        button.style.setProperty("--mx", `${((event.clientX - rect.left) / rect.width) * 100}%`);
        button.style.setProperty("--my", `${((event.clientY - rect.top) / rect.height) * 100}%`);
      });
    });
  };

  const bindPointerGlow = (scope = document) => {
    $$(".home-tile, .home-project-card, .editorial-card, .web-shot, .archive-row", scope).forEach((node) => {
      node.addEventListener("pointermove", (event) => {
        if (reducedMotion.matches || !finePointer.matches) return;
        const rect = node.getBoundingClientRect();
        node.style.setProperty("--mx", `${((event.clientX - rect.left) / rect.width) * 100}%`);
        node.style.setProperty("--my", `${((event.clientY - rect.top) / rect.height) * 100}%`);
      });
    });
  };

  const renderHeroRail = () => {
    const target = $("[data-hero-rail]");
    if (!target) return;
    const railItems = items.filter((item) => item.hero && !item.animated).slice(0, 14);
    const doubled = [...railItems, ...railItems];
    target.innerHTML = `
      <div class="rail-track">
        ${doubled.map((item) => `
          <div class="rail-item">
            <img src="${item.src}" alt="${escaped(item.title)}" width="${item.width}" height="${item.height}" loading="eager" decoding="async">
          </div>
        `).join("")}
      </div>
    `;
  };

  const homeCardMarkup = (card, index) => {
    const item = items.find((entry) => entry.id === card.itemId);
    if (!item) return "";
    return `
      <a class="home-project-card ${item.orientation} reveal" href="${card.href}" style="--tile-image: url('${item.src}'); transition-delay: ${index * 70}ms" aria-label="Open ${escaped(card.title)}">
        <span class="home-project-media">
          <img src="${item.src}" alt="${escaped(card.title)}" width="${item.width}" height="${item.height}" loading="lazy" decoding="async">
        </span>
        <span class="home-project-copy">
          <span>${escaped(card.meta)}</span>
          <strong>${escaped(card.title)}</strong>
          <em>${escaped(card.description)}</em>
        </span>
      </a>
    `;
  };

  const renderHomeSections = () => {
    const target = $("[data-home-sections]");
    if (!target) return;
    const groups = [
      {
        label: "01",
        title: "Projects",
        copy: "Startup identities, product-facing covers, graphics, and community visuals.",
        cards: [
          {
            title: "Hype Bears",
            meta: "Startup Project",
            description: "Collection identity, startup graphics, social systems, and web graphics.",
            href: "hype-bears.html",
            itemId: "hype-bears-hero"
          },
          {
            title: "GM.CO / PXN",
            meta: "Startup Project",
            description: "Dark project visuals, identity pieces, and crypto-native product graphics.",
            href: "pxn.html",
            itemId: "gm-co-cover"
          },
          {
            title: "PSSD",
            meta: "Project",
            description: "Dark campaign cover system and supporting startup visuals.",
            href: "pxn.html#pssd",
            itemId: "hype-bears-archive"
          }
        ]
      },
      {
        label: "02",
        title: "Web Designs",
        copy: "Full-length website designs, product pages, landing pages, and interface concepts.",
        cards: [
          {
            title: "iPredict",
            meta: "Crypto Trading Page",
            description: "A smarter way to trade cryptocurrency, built as a long product landing page.",
            href: "web-designs.html",
            itemId: "upvotic-landing"
          },
          {
            title: "CrazyRDP",
            meta: "Hosting Landing Page",
            description: "Real anonymous hosting with dense product sections and pricing.",
            href: "web-designs.html",
            itemId: "anonymous-hosting-page"
          },
          {
            title: "rdp.sh",
            meta: "RDP Landing Page",
            description: "Dark RDP product page with a full-length service story.",
            href: "web-designs.html",
            itemId: "rdp-sh-landing"
          }
        ]
      }
    ];

    target.innerHTML = groups.map((group) => {
      const slug = escaped(group.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
      return `
      <section class="home-group home-group-${slug} reveal" aria-labelledby="${slug}">
        <div class="home-group-head">
          <p class="section-index">${escaped(group.label)}</p>
          <div>
            <h2 id="${slug}">${escaped(group.title)}</h2>
            <p>${escaped(group.copy)}</p>
          </div>
        </div>
        <div class="home-project-grid">
          ${group.cards.map((card, index) => homeCardMarkup(card, index)).join("")}
        </div>
      </section>
    `;
    }).join("");
    bindPointerGlow(target);
  };

  const renderFeatured = () => {
    const target = $("[data-featured-grid]");
    if (!target) return;
    const featured = galleryItems().filter((item) => item.featured && !item.animated).slice(0, 8);
    target.innerHTML = featured.map((item) => cardMarkup(item, items.indexOf(item))).join("");
    bindOpeners(target);
  };

  const renderWebPreview = () => {
    const target = $("[data-web-preview]");
    if (!target) return;
    const webItems = galleryItems().filter((item) => item.webCase).slice(0, 4);
    target.innerHTML = webItems.map((item) => caseMarkup(item, items.indexOf(item))).join("");
    bindOpeners(target);
  };

  const renderArchiveStrip = () => {
    const target = $("[data-archive-strip]");
    if (!target) return;
    const archive = galleryItems().filter((item) => ["nft", "thread", "brand"].includes(item.category) && !item.animated).slice(0, 5);
    target.innerHTML = archive.map((item) => cardMarkup(item, items.indexOf(item))).join("");
    bindOpeners(target);
  };

  const buildFilterBar = (initial = "all") => {
    const target = $("[data-filter-bar]");
    if (!target) return;
    const galleryMode = $("[data-gallery]")?.dataset.gallery;
    const allowed = galleryMode === "archive"
      ? categories.filter(([key]) => key !== "web")
      : categories;
    target.innerHTML = allowed.map(([key, label]) => `
      <button class="filter-button" type="button" data-filter="${key}" aria-pressed="${key === initial}">
        ${label}
      </button>
    `).join("");
    target.addEventListener("click", (event) => {
      const button = event.target.closest("[data-filter]");
      if (!button) return;
      $$("[data-filter]", target).forEach((node) => node.setAttribute("aria-pressed", String(node === button)));
      if ($("[data-archive-list]")) {
        renderArchiveExperience(button.dataset.filter);
      } else {
        renderGallery(button.dataset.filter);
      }
    });
  };

  const galleryBaseItems = () => {
    const gallery = $("[data-gallery]");
    if (!gallery) return [];
    const mode = gallery.dataset.gallery;
    const source = galleryItems();
    if (mode === "archive") {
      return source.filter((item) => item.category !== "web");
    }
    if (mode === "web") {
      return source
        .filter((item) => item.webCase)
        .sort((a, b) => {
          const aIndex = webDesignOrder.indexOf(a.id);
          const bIndex = webDesignOrder.indexOf(b.id);
          return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
        });
    }
    return source;
  };

  const renderGallery = (filter = "all") => {
    const target = $("[data-gallery]");
    if (!target) return;
    const source = galleryBaseItems();
    const filtered = filter === "all" ? source : source.filter((item) => item.category === filter);
    activeItems = filtered;
    target.innerHTML = filtered.map((item) => cardMarkup(item, items.indexOf(item))).join("");
    bindOpeners(target);
    revealNow(target);
  };

  const renderWebList = () => {
    const target = $("[data-web-list]");
    if (!target) return;
    const webItems = galleryItems().filter((item) => item.webCase);
    target.innerHTML = webItems.map((item) => caseMarkup(item, items.indexOf(item))).join("");
    bindOpeners(target);
  };

  const renderArchiveExperience = (filter = "all") => {
    const list = $("[data-archive-list]");
    if (!list) return;
    const strip = $("[data-archive-strip]");
    const count = $("[data-archive-count]");
    const source = galleryItems();
    const filtered = filter === "all" ? source : source.filter((item) => item.category === filter);
    activeItems = filtered;
    if (count) count.textContent = `${filtered.length} items`;

    const visualItems = filtered.filter((item) => !item.animated).slice(0, 14);
    if (strip) {
      strip.innerHTML = `
        <div class="archive-strip-track">
          ${visualItems.map((item) => `
            <button class="strip-thumb reveal" type="button" data-index="${items.indexOf(item)}" aria-label="Open ${escaped(item.title)} preview">
              <img src="${item.src}" alt="${escaped(item.title)}" width="${item.width}" height="${item.height}" loading="lazy" decoding="async">
              <span>${escaped(item.title)}</span>
            </button>
          `).join("")}
        </div>
      `;
      bindOpeners(strip);
    }

    list.innerHTML = filtered.map((item) => `
      <button class="archive-row reveal" type="button" data-index="${items.indexOf(item)}" aria-label="Open ${escaped(item.title)} preview">
        <span class="archive-year">${escaped(item.year)}</span>
        <span class="archive-thumb">
          <img src="${item.src}" alt="" width="${item.width}" height="${item.height}" loading="lazy" decoding="async">
        </span>
        <span class="archive-main">
          <strong>${escaped(item.title)}</strong>
          <em>${escaped(item.description)}</em>
        </span>
        <span class="archive-kind">${escaped(item.kind)}</span>
        <span class="archive-view">View &rarr;</span>
      </button>
    `).join("");
    bindOpeners(list);
    bindPointerGlow(list);
    revealNow(list);
    if (strip) revealNow(strip);
  };

  const renderWebsiteSlots = () => {
    const target = $("[data-website-slots]");
    if (!target) return;
    const slots = site.websitesToAdd || [];
    target.innerHTML = slots.map((slot) => `
      <article class="future-slot reveal">
        <span class="future-status">${escaped(slot.status)}</span>
        <h3>${escaped(slot.title)}</h3>
        <p>${escaped(slot.note)}</p>
      </article>
    `).join("");
  };

  const renderDetailGallery = () => {
    const target = $("[data-detail-gallery]");
    if (!target) return;
    const sets = {
      "hype-bears": [
        "hype-bears-cover",
        "hype-bears-hero",
        "instagram-milestone",
        "expanded-discord",
        "wrap-mechanics",
        "collectible-bears",
        "twenty-four-hours",
        "casetify-collaboration",
        "website-launched",
        "website-launch-alt",
        "200k-followers",
        "launch-date",
        "winners-announcement",
        "instagram-milestone-alt"
      ],
      pxn: [
        "gm-co-cover",
        "hype-bears-archive",
        "projectxl-landing",
        "crypto-bot-page",
        "upvotic-landing"
      ],
      "crypto-startups": [
        "hype-bears-hero",
        "gm-co-cover",
        "hype-bears-archive",
        "projectxl-landing",
        "crypto-bot-page",
        "upvotic-landing"
      ]
    };
    const selected = (sets[target.dataset.detailGallery] || [])
      .map((id) => items.find((item) => item.id === id))
      .filter(Boolean);
    activeItems = selected;
    target.innerHTML = selected.map((item) => cardMarkup(item, items.indexOf(item))).join("");
    bindOpeners(target);
    revealNow(target);
  };

  const openLightbox = (index) => {
    const lightbox = $("[data-lightbox]");
    if (!lightbox) return;
    activeIndex = index;
    lightbox.classList.remove("is-open");
    lightbox.classList.add("is-preparing");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    updateLightbox();
    requestAnimationFrame(() => {
      lightbox.classList.add("is-open");
      lightbox.classList.remove("is-preparing");
      $("[data-lightbox-close]")?.focus();
    });
  };

  const closeLightbox = () => {
    const lightbox = $("[data-lightbox]");
    if (!lightbox) return;
    lightbox.classList.remove("is-open");
    lightbox.classList.remove("is-preparing");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    resetLightboxZoom();
  };

  const resetLightboxZoom = () => {
    lightboxZoom = 1;
    lightboxPanX = 0;
    lightboxPanY = 0;
    lightboxDrag = null;
    applyLightboxTransform();
  };

  const applyLightboxTransform = () => {
    const stage = $("[data-lightbox-stage]");
    const image = $("[data-lightbox-image]");
    const reset = $("[data-zoom-reset]");
    if (!stage || !image) return;
    const maxX = Math.max(0, ((image.offsetWidth || 0) * lightboxZoom - stage.clientWidth) / 2 + 24);
    const maxY = Math.max(0, ((image.offsetHeight || 0) * lightboxZoom - stage.clientHeight) / 2 + 24);
    lightboxPanX = lightboxZoom <= 1 ? 0 : clamp(lightboxPanX, -maxX, maxX);
    lightboxPanY = lightboxZoom <= 1 ? 0 : clamp(lightboxPanY, -maxY, maxY);
    image.style.setProperty("--zoom", lightboxZoom.toFixed(3));
    image.style.setProperty("--pan-x", `${lightboxPanX.toFixed(1)}px`);
    image.style.setProperty("--pan-y", `${lightboxPanY.toFixed(1)}px`);
    stage.classList.toggle("is-zoomed", lightboxZoom > 1.01);
    if (reset) reset.textContent = `${Math.round(lightboxZoom * 100)}%`;
  };

  const setLightboxZoom = (value) => {
    const next = clamp(value, 1, 5);
    lightboxZoom = Math.abs(next - 1) < 0.04 ? 1 : next;
    if (lightboxZoom === 1) {
      lightboxPanX = 0;
      lightboxPanY = 0;
    }
    applyLightboxTransform();
  };

  const setupLightboxZoom = (media) => {
    const stage = $("[data-lightbox-stage]", media);
    if (!stage) return;

    stage.addEventListener("wheel", (event) => {
      event.preventDefault();
      setLightboxZoom(lightboxZoom * (event.deltaY < 0 ? 1.14 : 0.88));
    }, { passive: false });

    stage.addEventListener("click", (event) => {
      if (event.target.closest("[data-zoom]")) return;
      if (lightboxDrag?.moved) {
        lightboxDrag.moved = false;
        return;
      }
      setLightboxZoom(lightboxZoom >= 4.8 ? 1 : lightboxZoom * 1.65);
    });

    stage.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (lightboxZoom <= 1.01 || event.target.closest("[data-zoom]")) return;
      event.preventDefault();
      stage.setPointerCapture(event.pointerId);
      stage.classList.add("is-dragging");
      lightboxDrag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        panX: lightboxPanX,
        panY: lightboxPanY,
        moved: false
      };
    });

    stage.addEventListener("pointermove", (event) => {
      if (!lightboxDrag || lightboxDrag.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - lightboxDrag.startX;
      const deltaY = event.clientY - lightboxDrag.startY;
      lightboxDrag.moved = lightboxDrag.moved || Math.abs(deltaX) + Math.abs(deltaY) > 5;
      lightboxPanX = lightboxDrag.panX + deltaX;
      lightboxPanY = lightboxDrag.panY + deltaY;
      applyLightboxTransform();
    });

    const endDrag = (event) => {
      if (!lightboxDrag || lightboxDrag.pointerId !== event.pointerId) return;
      stage.classList.remove("is-dragging");
      lightboxDrag = { moved: lightboxDrag.moved };
    };

    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);

    $("[data-zoom='out']", media)?.addEventListener("click", () => setLightboxZoom(lightboxZoom / 1.35));
    $("[data-zoom='reset']", media)?.addEventListener("click", resetLightboxZoom);
    $("[data-zoom='in']", media)?.addEventListener("click", () => setLightboxZoom(lightboxZoom * 1.35));
  };

  const updateLightbox = () => {
    const item = items[activeIndex];
    if (!item) return;
    const media = $("[data-lightbox-media]");
    const title = $("[data-lightbox-title]");
    const kind = $("[data-lightbox-kind]");
    const desc = $("[data-lightbox-desc]");
    resetLightboxZoom();
    media.classList.add("is-switching");
    media.classList.remove("is-loaded");
    media.innerHTML = `
      <div class="lightbox-zoom-stage" data-lightbox-stage data-orientation="${escaped(item.orientation)}">
        <img data-lightbox-image src="${item.src}" alt="${escaped(item.title)}" width="${item.width}" height="${item.height}" draggable="false">
      </div>
      <div class="lightbox-toolbar" aria-label="Image zoom controls">
        <button class="zoom-button zoom-out" type="button" data-zoom="out" aria-label="Zoom out"></button>
        <button class="zoom-reset" type="button" data-zoom="reset" data-zoom-reset aria-label="Reset zoom">100%</button>
        <button class="zoom-button zoom-in" type="button" data-zoom="in" aria-label="Zoom in"></button>
      </div>
    `;
    title.textContent = item.title;
    kind.textContent = `${item.kind} / ${categoryLabel(item.category)}`;
    desc.textContent = item.description;
    setupLightboxZoom(media);
    const image = $("[data-lightbox-image]", media);
    const revealImage = () => {
      requestAnimationFrame(() => {
        applyLightboxTransform();
        media.classList.remove("is-switching");
        media.classList.add("is-loaded");
      });
    };
    if (image?.complete) revealImage();
    else image?.addEventListener("load", revealImage, { once: true });
  };

  const moveLightbox = (direction) => {
    const visibleIndexes = activeItems.length ? activeItems.map((item) => items.indexOf(item)) : items.map((_, index) => index);
    const current = visibleIndexes.indexOf(activeIndex);
    const next = current === -1
      ? 0
      : (current + direction + visibleIndexes.length) % visibleIndexes.length;
    activeIndex = visibleIndexes[next];
    updateLightbox();
  };

  const setupLightbox = () => {
    $("[data-lightbox-close]")?.addEventListener("click", closeLightbox);
    $("[data-lightbox-prev]")?.addEventListener("click", () => moveLightbox(-1));
    $("[data-lightbox-next]")?.addEventListener("click", () => moveLightbox(1));
    $("[data-lightbox]")?.addEventListener("click", (event) => {
      if (event.target.matches("[data-lightbox]")) closeLightbox();
    });
    document.addEventListener("keydown", (event) => {
      if (!$("[data-lightbox]")?.classList.contains("is-open")) return;
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") moveLightbox(-1);
      if (event.key === "ArrowRight") moveLightbox(1);
      if (event.key === "+" || event.key === "=") setLightboxZoom(lightboxZoom * 1.25);
      if (event.key === "-") setLightboxZoom(lightboxZoom / 1.25);
      if (event.key === "0") resetLightboxZoom();
    });
  };

  const setupNav = () => {
    const page = document.body.dataset.page;
    $$("[data-nav]").forEach((link) => {
      const isCurrent = link.dataset.nav === page;
      if (isCurrent) link.setAttribute("aria-current", "page");
    });
    $$("[data-linkedin]").forEach((link) => {
      link.href = site.linkedin;
    });
  };

  const setupProgress = () => {
    const bar = $("[data-scroll-progress]");
    if (!bar || !("ScrollTimeline" in window)) return;
    bar.animate({ transform: ["scaleX(0)", "scaleX(1)"] }, {
      fill: "both",
      timeline: new ScrollTimeline({ source: document.documentElement, axis: "block" })
    });
  };

  const setupPageMotion = () => {
    requestAnimationFrame(() => document.body.classList.add("page-loaded"));
    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[href]");
      if (!link) return;
      const url = new URL(link.href, window.location.href);
      const isSamePageHash = url.pathname === window.location.pathname && url.hash;
      const isInternal = url.origin === window.location.origin && link.target !== "_blank";
      if (!isInternal || isSamePageHash || reducedMotion.matches || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      document.body.classList.add("page-leaving");
      window.setTimeout(() => {
        window.location.href = link.href;
      }, 180);
    });
  };

  const setupMobileNav = () => {
    const header = $("[data-header]");
    const nav = $(".nav-shell");
    if (!header || !nav || $(".nav-toggle", nav)) return;
    const toggle = document.createElement("button");
    toggle.className = "nav-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-label", "Open navigation");
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = "<span></span><span></span>";
    nav.append(toggle);

    const panel = document.createElement("div");
    panel.className = "mobile-nav-panel";
    panel.setAttribute("aria-hidden", "true");
    panel.innerHTML = `
      <a href="index.html" data-mobile-nav="home">Home</a>
      <a href="projects.html" data-mobile-nav="projects">All Projects</a>
      <a href="web-designs.html" data-mobile-nav="web">Web Designs</a>
      <a href="crypto-startups.html" data-mobile-nav="crypto">Startup Projects</a>
      <a href="${escaped(site.linkedin)}" data-linkedin target="_blank" rel="noreferrer">LinkedIn</a>
    `;
    header.append(panel);

    const close = () => {
      document.body.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
      panel.setAttribute("aria-hidden", "true");
    };
    const open = () => {
      document.body.classList.add("nav-open");
      toggle.setAttribute("aria-expanded", "true");
      panel.setAttribute("aria-hidden", "false");
    };

    toggle.addEventListener("click", () => {
      if (document.body.classList.contains("nav-open")) close();
      else open();
    });
    $$("a", panel).forEach((link) => link.addEventListener("click", close));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });
  };

  const setupCinematicMotion = () => {
    const pauseWhenHidden = () => document.body.classList.toggle("motion-paused", document.hidden);
    pauseWhenHidden();
    document.addEventListener("visibilitychange", pauseWhenHidden);
    $$("[data-parallax-stage]").forEach((stage) => {
      const layers = $$("[data-depth]", stage);
      stage.addEventListener("pointermove", (event) => {
        if (reducedMotion.matches || !finePointer.matches) return;
        const rect = stage.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        layers.forEach((layer) => {
          const depth = Number(layer.dataset.depth || 0);
          layer.style.setProperty("--parallax-x", `${(x * depth * 120).toFixed(1)}px`);
          layer.style.setProperty("--parallax-y", `${(y * depth * 90).toFixed(1)}px`);
        });
      });
      stage.addEventListener("pointerleave", () => {
        layers.forEach((layer) => {
          layer.style.setProperty("--parallax-x", "0px");
          layer.style.setProperty("--parallax-y", "0px");
        });
      });
    });
  };

  const revealNow = (scope = document) => {
    $$(".project-card, .case-row, .future-slot, .archive-row, .strip-thumb", scope).forEach((node, index) => {
      node.classList.add("reveal");
      node.style.transitionDelay = `${Math.min(index * 28, 180)}ms`;
      requestAnimationFrame(() => node.classList.add("is-visible"));
    });
  };

  const setupReveals = () => {
    const heroNodes = $$(".cinematic-hero [data-reveal]");
    heroNodes.forEach((node) => requestAnimationFrame(() => node.classList.add("is-visible")));

    const revealNodes = $$("[data-reveal], .reveal").filter((node) => !node.closest(".cinematic-hero"));
    if (!("IntersectionObserver" in window)) {
      revealNodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px 20% 0px", threshold: 0.01 });
    revealNodes.forEach((node) => observer.observe(node));
  };

  renderHeroRail();
  renderHomeSections();
  renderFeatured();
  renderWebPreview();
  renderArchiveStrip();
  buildFilterBar();
  renderGallery();
  renderArchiveExperience();
  renderWebList();
  renderWebsiteSlots();
  renderDetailGallery();
  setupNav();
  setupMobileNav();
  setupProgress();
  setupPageMotion();
  setupLightbox();
  setupCinematicMotion();
  bindPointerGlow(document);
  bindOpeners(document);
  setupReveals();
})();
