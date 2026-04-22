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
     * iOS Safari auto-zooms into form fields whose font-size is below 16px on
     * focus, but never restores the zoom on blur. We want both directions to
     * feel automatic, so when an input loses focus we replace the viewport
     * meta with one that has `maximum-scale=1, user-scalable=no` (forcing iOS
     * to clamp the page zoom back to 1.0) and then, after Safari has applied
     * the clamp, swap it back to the zoomable viewport so the user can still
     * pinch-zoom freely for accessibility.
     *
     * Replacing the element (instead of mutating its `content` in place) is
     * necessary on modern iOS where in-place mutations are sometimes ignored.
     */
    const isIOS = (
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    ) && !window.MSStream;

    const VIEWPORT_DEFAULT = 'width=device-width, initial-scale=1, viewport-fit=cover';
    const VIEWPORT_CLAMPED = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';

    function setViewport(content) {
        const old = document.getElementById('viewport');
        if (!old) return null;
        const fresh = document.createElement('meta');
        fresh.id = 'viewport';
        fresh.name = 'viewport';
        fresh.setAttribute('content', content);
        old.parentNode.replaceChild(fresh, old);
        return fresh;
    }

    let zoomResetTimer = null;

    function resetIOSZoom() {
        if (zoomResetTimer) clearTimeout(zoomResetTimer);
        setViewport(VIEWPORT_CLAMPED);
        zoomResetTimer = setTimeout(function () {
            setViewport(VIEWPORT_DEFAULT);
            zoomResetTimer = null;
        }, 400);
    }

    function installIOSZoomReset() {
        if (!isIOS) return;
        document.addEventListener('focusout', function (e) {
            const t = e.target;
            if (!t || !t.matches || !t.matches('input, textarea, select')) return;
            setTimeout(resetIOSZoom, 50);
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
