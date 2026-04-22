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

    document.addEventListener('DOMContentLoaded', function () {
        const form = document.getElementById('qrcForm');
        if (form) form.addEventListener('submit', handleSubmit);

        const toggle = document.getElementById('themeToggle');
        if (toggle) toggle.addEventListener('click', Theme.toggle);
    });

    window.addEventListener('beforeunload', function () {
        if (lastObjectUrl) URL.revokeObjectURL(lastObjectUrl);
    });
})();
