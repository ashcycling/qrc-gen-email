(function () {
    'use strict';

    const Theme = {
        key: 'theme',
        get current() {
            return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        },
        apply(value) {
            const next = value === 'dark' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', next);
            try { localStorage.setItem(Theme.key, next); } catch (_) {}
        },
        toggle() {
            Theme.apply(Theme.current === 'dark' ? 'light' : 'dark');
        },
    };

    let lastObjectUrl = null;

    function setToast(state, message) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        if (!state) {
            toast.hidden = true;
            toast.className = 'toast';
            toast.textContent = '';
            return;
        }
        toast.hidden = false;
        toast.className = 'toast is-' + state;
        toast.textContent = message;
    }

    function showResult(blobUrl) {
        const result = document.getElementById('result');
        const img = document.getElementById('qrCodeImage');
        const link = document.getElementById('downloadLink');
        if (!result || !img || !link) return;
        img.src = blobUrl;
        link.href = blobUrl;
        link.download = `qr-code-${Date.now()}.png`;
        result.hidden = false;
    }

    function hideResult() {
        const result = document.getElementById('result');
        if (result) result.hidden = true;
    }

    function base64ToBlob(b64, type) {
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type });
    }

    function readFormValues() {
        const sizeInput = document.getElementById('qrcSize');
        const mailInput = document.getElementById('mailto');
        const subjectInput = document.getElementById('subject');
        return {
            qrcSize: parseInt(sizeInput.value || sizeInput.placeholder, 10),
            mailto: (mailInput.value || '').trim(),
            subject: subjectInput.value || '',
        };
    }

    function validate({ qrcSize, mailto }) {
        if (!mailto) return 'Email address is required.';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(mailto)) return 'Please enter a valid email address.';
        if (Number.isNaN(qrcSize) || qrcSize < 100 || qrcSize > 1000) {
            return 'Size must be a number between 100 and 1000.';
        }
        return null;
    }

    async function handleSubmit(event) {
        event.preventDefault();
        const submitBtn = document.getElementById('submitBtn');
        const labelEl = submitBtn.querySelector('.btn-label');
        const originalLabel = labelEl ? labelEl.textContent : 'Generate';

        const values = readFormValues();
        const validationError = validate(values);
        if (validationError) {
            hideResult();
            setToast('error', validationError);
            return;
        }

        submitBtn.disabled = true;
        if (labelEl) labelEl.textContent = 'Generating…';
        setToast('loading', 'Generating QR code…');
        hideResult();

        try {
            const response = await fetch('/api/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                setToast('error', result.message || 'Request failed.');
                return;
            }

            if (result.data && result.data.qrCodeBase64) {
                if (lastObjectUrl) URL.revokeObjectURL(lastObjectUrl);
                const blob = base64ToBlob(result.data.qrCodeBase64, 'image/png');
                lastObjectUrl = URL.createObjectURL(blob);
                showResult(lastObjectUrl);
                setToast('success', result.message || 'QR code generated.');
            } else {
                setToast('success', result.message || 'Done.');
            }
        } catch (err) {
            setToast('error', 'Network error: ' + (err && err.message ? err.message : 'unknown'));
        } finally {
            submitBtn.disabled = false;
            if (labelEl) labelEl.textContent = originalLabel;
        }
    }

    /**
     * iOS Safari auto-zooms into form fields with font-size < 16px on focus
     * but does not auto-zoom out on blur. Modern iOS (>=17, definitely 26)
     * ignores dynamic mutation of the <meta name="viewport"> content, so the
     * classic viewport-toggle hack alone no longer works.
     *
     * The technique below combines two mechanisms because no single one is
     * reliable on every iOS version:
     *
     *   1. Focus-decoy. We pre-mount an invisible secondary <input> whose
     *      font-size is 16px (i.e. above the auto-zoom threshold). When the
     *      real input loses focus we briefly move focus to the decoy. Safari
     *      re-evaluates its zoom level for every focus event, and because the
     *      decoy is 16px it has no reason to keep the page zoomed in — it
     *      typically drops back to scale 1.0. We then blur the decoy so the
     *      keyboard dismisses normally.
     *
     *   2. Viewport replacement. We also swap the viewport meta element for a
     *      fresh one with `maximum-scale=1, user-scalable=no` and, after a
     *      short delay, restore the zoomable viewport so users can still
     *      pinch-zoom for accessibility. Some iOS versions still react to
     *      this when the meta element is fully replaced rather than mutated.
     *
     * If focus is moving to another real form field (user is just tabbing
     * between inputs), we skip the reset so we don't disrupt the keyboard.
     */
    const isIOS = (
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    ) && !window.MSStream;

    function installIOSZoomReset() {
        if (!isIOS) return;

        const decoy = document.createElement('input');
        decoy.type = 'text';
        decoy.setAttribute('aria-hidden', 'true');
        decoy.setAttribute('tabindex', '-1');
        decoy.readOnly = true;
        decoy.style.cssText = [
            'position:fixed',
            'top:0',
            'left:0',
            'width:1px',
            'height:1px',
            'font-size:16px',
            'line-height:16px',
            'opacity:0',
            'border:0',
            'padding:0',
            'margin:0',
            'background:transparent',
            'color:transparent',
            'caret-color:transparent',
            'pointer-events:none',
            'z-index:-1',
        ].join(';');
        document.body.appendChild(decoy);

        const VP_DEFAULT = 'width=device-width, initial-scale=1, viewport-fit=cover';
        const VP_LOCKED = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';

        function swapViewport(content) {
            const old = document.querySelector('meta[name="viewport"]');
            if (!old) return;
            const fresh = document.createElement('meta');
            fresh.name = 'viewport';
            fresh.setAttribute('content', content);
            old.parentNode.replaceChild(fresh, old);
        }

        let resetTimer = null;

        function isFormField(el) {
            return !!(el && el.matches && el.matches('input, textarea, select'));
        }

        document.addEventListener('focusout', function (e) {
            const t = e.target;
            if (!t || t === decoy || !isFormField(t)) return;

            setTimeout(function () {
                const next = document.activeElement;
                if (next && next !== document.body && next !== decoy && isFormField(next)) {
                    return;
                }

                swapViewport(VP_LOCKED);

                decoy.style.pointerEvents = 'auto';
                try {
                    decoy.focus({ preventScroll: true });
                } catch (_) {
                    decoy.focus();
                }

                if (resetTimer) clearTimeout(resetTimer);
                resetTimer = setTimeout(function () {
                    decoy.blur();
                    decoy.style.pointerEvents = 'none';
                    swapViewport(VP_DEFAULT);
                    window.scrollTo(0, 0);
                    resetTimer = null;
                }, 60);
            }, 0);
        }, true);
    }

    document.addEventListener('DOMContentLoaded', function () {
        const form = document.getElementById('qrcForm');
        if (form) form.addEventListener('submit', handleSubmit);

        const toggle = document.getElementById('themeToggle');
        if (toggle) toggle.addEventListener('click', Theme.toggle);

        installIOSZoomReset();
    });

    window.addEventListener('beforeunload', function () {
        if (lastObjectUrl) URL.revokeObjectURL(lastObjectUrl);
    });
})();
