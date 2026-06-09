/**
 * ImageToPDF 360 — Liquid Glass Edition
 * Premium image-to-PDF converter — 100% client-side
 */
(function () {
    'use strict';

    /* ===== STATE ===== */
    const images = [];
    let dragIdx = null;

    /* ===== DOM ===== */
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => document.querySelectorAll(s);

    const el = {
        upload:    $('#uploadArea'),
        input:     $('#fileInput'),
        preview:   $('#previewSection'),
        grid:      $('#previewGrid'),
        convert:   $('#convertSection'),
        btn:       $('#convertBtn'),
        count:     $('#imageCount'),
        progArea:  $('#progressArea'),
        progFill:  $('#progressFill'),
        progLabel: $('#progressLabel'),
        clear:     $('#clearAll'),
        sort:      $('#sortAZ'),
        margin:    $('#margin'),
        marginVal: $('#marginVal'),
        quality:   $('#quality'),
        qualityVal:$('#qualityVal'),
        toasts:    $('#toastStack'),
        orbs:      $('#floatingOrbs'),
    };

    /* ===== INIT ===== */
    function init() {
        createFloatingOrbs();
        bind();
        syncRanges();
    }

    /* ===== FLOATING GLASS ORBS ===== */
    function createFloatingOrbs() {
        for (let i = 0; i < 18; i++) {
            const orb = document.createElement('div');
            orb.className = 'orb';
            const size = Math.random() * 30 + 8;
            orb.style.cssText = `
                width: ${size}px;
                height: ${size}px;
                left: ${Math.random() * 100}%;
                animation-duration: ${Math.random() * 22 + 18}s;
                animation-delay: ${Math.random() * 15}s;
            `;
            el.orbs.appendChild(orb);
        }
    }

    /* ===== EVENTS ===== */
    function bind() {
        el.upload.addEventListener('click', () => el.input.click());
        el.input.addEventListener('change', onFiles);

        el.upload.addEventListener('dragover', (e) => {
            e.preventDefault();
            el.upload.classList.add('drag-over');
        });
        el.upload.addEventListener('dragleave', () =>
            el.upload.classList.remove('drag-over')
        );
        el.upload.addEventListener('drop', (e) => {
            e.preventDefault();
            el.upload.classList.remove('drag-over');
            addFiles([...e.dataTransfer.files]);
        });

        el.btn.addEventListener('click', makePDF);

        el.clear.addEventListener('click', () => {
            images.length = 0;
            render();
            toast('Tutte le immagini rimosse', 'info');
        });

        el.sort.addEventListener('click', () => {
            images.sort((a, b) => a.name.localeCompare(b.name));
            render();
            toast('Ordinate A → Z', 'info');
        });

        el.margin.addEventListener('input', syncRanges);
        el.quality.addEventListener('input', syncRanges);
    }

    function syncRanges() {
        el.marginVal.textContent = el.margin.value + ' mm';
        el.qualityVal.textContent = Math.round(el.quality.value * 100) + '%';
    }

    /* ===== FILES ===== */
    function onFiles(e) {
        addFiles([...e.target.files]);
        el.input.value = '';
    }

    function addFiles(files) {
        const ok = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        const valid = files.filter((f) => ok.includes(f.type));
        const bad = files.length - valid.length;

        if (bad) toast(`${bad} file ignorat${bad > 1 ? 'i' : 'o'}`, 'error');
        if (!valid.length) return;

        let done = 0;
        valid.forEach((file) => {
            const r = new FileReader();
            r.onload = (ev) => {
                images.push({
                    id: uid(),
                    file,
                    name: file.name,
                    url: ev.target.result,
                });
                if (++done === valid.length) {
                    render();
                    toast(`${valid.length} immagin${valid.length > 1 ? 'i aggiunte' : 'e aggiunta'}`, 'success');
                }
            };
            r.readAsDataURL(file);
        });
    }

    function uid() {
        return Math.random().toString(36).slice(2, 11);
    }

    /* ===== RENDER ===== */
    function render() {
        el.grid.innerHTML = '';
        el.count.textContent = images.length;

        const show = images.length > 0;
        el.preview.classList.toggle('visible', show);
        el.convert.classList.toggle('visible', show);
        el.btn.disabled = !show;

        images.forEach((img, i) => {
            const card = document.createElement('div');
            card.className = 'img-card';
            card.draggable = true;
            card.dataset.i = i;
            card.style.animationDelay = `${i * 0.04}s`;

            card.innerHTML = `
                <img class="thumb" src="${img.url}" alt="${img.name}" loading="lazy">
                <div class="img-meta">
                    <span class="img-name" title="${img.name}">${img.name}</span>
                    <span class="img-page">P.${i + 1}</span>
                </div>
                <button class="img-remove" data-id="${img.id}" title="Rimuovi">✕</button>
            `;

            card.querySelector('.img-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.currentTarget.dataset.id;
                const idx = images.findIndex((x) => x.id === id);
                if (idx > -1) images.splice(idx, 1);
                render();
                toast('Immagine rimossa', 'info');
            });

            card.addEventListener('dragstart', dStart);
            card.addEventListener('dragover', dOver);
            card.addEventListener('dragenter', dEnter);
            card.addEventListener('dragleave', dLeave);
            card.addEventListener('drop', dDrop);
            card.addEventListener('dragend', dEnd);

            el.grid.appendChild(card);
        });
    }

    /* ===== DRAG REORDER ===== */
    function dStart(e) {
        dragIdx = +this.dataset.i;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }
    function dOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
    function dEnter(e) { e.preventDefault(); this.classList.add('drag-target'); }
    function dLeave() { this.classList.remove('drag-target'); }
    function dDrop(e) {
        e.preventDefault();
        this.classList.remove('drag-target');
        const to = +this.dataset.i;
        if (dragIdx !== null && dragIdx !== to) {
            const item = images.splice(dragIdx, 1)[0];
            images.splice(to, 0, item);
            render();
        }
    }
    function dEnd() {
        this.classList.remove('dragging');
        $$('.img-card').forEach((c) => c.classList.remove('drag-target'));
    }

    /* ===== PDF ===== */
    async function makePDF() {
        if (!images.length) return;

        const { jsPDF } = window.jspdf;
        const size = $('#pageSize').value;
        const ori = $('#orientation').value;
        const margin = +el.margin.value;
        const fit = $('#fitToPage').checked;
        const name = ($('#pdfName').value.trim() || 'ImageToPDF360_output') + '.pdf';

        el.btn.disabled = true;
        el.progArea.classList.add('active');
        el.progFill.style.width = '0%';
        el.progLabel.textContent = 'Preparazione…';

        try {
            let pdf = null;

            for (let i = 0; i < images.length; i++) {
                const pct = Math.round(((i + 1) / images.length) * 100);
                el.progFill.style.width = pct + '%';
                el.progLabel.textContent = `Immagine ${i + 1} di ${images.length}…`;

                const im = await loadImg(images[i].url);
                const iw = im.naturalWidth;
                const ih = im.naturalHeight;

                let o = ori === 'auto' ? (iw > ih ? 'landscape' : 'portrait') : ori;

                if (i === 0) {
                    if (size === 'fit') {
                        const ref = 297;
                        let pw, ph;
                        if (iw >= ih) { pw = ref; ph = (ih / iw) * ref; }
                        else { ph = ref; pw = (iw / ih) * ref; }
                        pdf = new jsPDF({ orientation: pw > ph ? 'l' : 'p', unit: 'mm', format: [pw, ph] });
                    } else {
                        pdf = new jsPDF({ orientation: o, unit: 'mm', format: size });
                    }
                } else {
                    if (size === 'fit') {
                        const ref = 297;
                        let pw, ph;
                        if (iw >= ih) { pw = ref; ph = (ih / iw) * ref; }
                        else { ph = ref; pw = (iw / ih) * ref; }
                        pdf.addPage([pw, ph], pw > ph ? 'l' : 'p');
                    } else {
                        pdf.addPage(size, o);
                    }
                }

                const pgW = pdf.internal.pageSize.getWidth();
                const pgH = pdf.internal.pageSize.getHeight();
                const aW = pgW - margin * 2;
                const aH = pgH - margin * 2;

                let dw, dh, dx, dy;

                if (fit) {
                    const r = Math.min(aW / iw, aH / ih);
                    dw = iw * r;
                    dh = ih * r;
                } else {
                    const px2mm = 0.2646;
                    dw = Math.min(iw * px2mm, aW);
                    dh = Math.min(ih * px2mm, aH);
                }

                dx = margin + (aW - dw) / 2;
                dy = margin + (aH - dh) / 2;

                const fmt = images[i].file.type === 'image/png' ? 'PNG' : 'JPEG';
                pdf.addImage(images[i].url, fmt, dx, dy, dw, dh, undefined, 'FAST');

                await delay(25);
            }

            el.progLabel.textContent = 'Salvataggio…';
            await delay(150);

            pdf.save(name);

            el.progFill.style.width = '100%';
            el.progLabel.textContent = 'PDF generato con successo! 🎉';
            toast('PDF scaricato! 🎉', 'success');
        } catch (err) {
            console.error(err);
            el.progLabel.textContent = 'Errore durante la conversione';
            toast('Errore: ' + err.message, 'error');
        } finally {
            el.btn.disabled = false;
            setTimeout(() => el.progArea.classList.remove('active'), 3500);
        }
    }

    function loadImg(src) {
        return new Promise((res, rej) => {
            const i = new Image();
            i.onload = () => res(i);
            i.onerror = rej;
            i.src = src;
        });
    }

    function delay(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }

    /* ===== TOAST ===== */
    function toast(msg, type = 'info') {
        const icons = { success: '✓', error: '✗', info: 'ℹ' };
        const t = document.createElement('div');
        t.className = `toast toast-${type}`;
        t.innerHTML = `<span>${icons[type]}</span> ${msg}`;
        el.toasts.appendChild(t);
        setTimeout(() => { if (t.parentElement) t.remove(); }, 3800);
    }

    /* ===== GO ===== */
    document.addEventListener('DOMContentLoaded', init);
})();