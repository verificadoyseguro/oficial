/**
 * ui-components.js — Componentes UI Premium Reutilizables
 * Contactos Anónimos v3.0
 *
 * Incluye:
 *   1. Componentes visuales premium
 *   2. Modales y diálogos
 *   3. Notificaciones y toasts
 *   4. Loaders y spinners
 *   5. Tooltips y popovers
 *   6. Dropdowns y menus
 *
 * @module UI_COMPONENTS
 * @version 3.0
 */

(function (global) {
    'use strict';

    /* ── Constantes ──────────────────────────────────────────── */

    const ANIMATION_DURATION = 300;

    /* ── Componentes ─────────────────────────────────────────── */

    /**
     * Crea un modal premium.
     */
    function createModal(options = {}) {
        const {
            title = 'Modal',
            content = '',
            buttons = [],
            onClose = null,
            size = 'md',
        } = options;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay modal-content-in';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            backdrop-filter: blur(5px);
        `;

        const sizeMap = {
            sm: '400px',
            md: '600px',
            lg: '800px',
            xl: '1000px',
        };

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.cssText = `
            background: linear-gradient(135deg, #0f1419 0%, #1a1d2e 100%);
            border-radius: 16px;
            box-shadow: 0 20px 48px rgba(0, 0, 0, 0.3);
            max-width: ${sizeMap[size] || sizeMap.md};
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;

        const header = document.createElement('div');
        header.className = 'modal-header';
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        `;

        const titleEl = document.createElement('h2');
        titleEl.textContent = title;
        titleEl.style.cssText = `
            margin: 0;
            font-size: 1.5rem;
            font-weight: 600;
            color: white;
        `;

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: #b0b3c1;
            font-size: 24px;
            cursor: pointer;
            transition: color 0.3s;
        `;
        closeBtn.onmouseover = () => closeBtn.style.color = '#25D366';
        closeBtn.onmouseout = () => closeBtn.style.color = '#b0b3c1';

        header.appendChild(titleEl);
        header.appendChild(closeBtn);

        const body = document.createElement('div');
        body.className = 'modal-body';
        body.style.cssText = `
            padding: 24px;
            color: #b0b3c1;
        `;
        body.innerHTML = content;

        const footer = document.createElement('div');
        footer.className = 'modal-footer';
        footer.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 24px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        `;

        buttons.forEach((btn) => {
            const button = document.createElement('button');
            button.textContent = btn.label;
            button.className = `btn btn-${btn.type || 'secondary'}`;
            button.onclick = () => {
                if (btn.onClick) btn.onClick();
                closeModal();
            };
            footer.appendChild(button);
        });

        modalContent.appendChild(header);
        modalContent.appendChild(body);
        if (buttons.length > 0) {
            modalContent.appendChild(footer);
        }

        modal.appendChild(modalContent);

        function closeModal() {
            modal.classList.remove('modal-content-in');
            modal.classList.add('modal-content-out');
            setTimeout(() => {
                modal.remove();
                if (onClose) onClose();
            }, ANIMATION_DURATION);
        }

        closeBtn.onclick = closeModal;
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };

        return modal;
    }

    /**
     * Crea una notificación toast.
     */
    function createToast(message, options = {}) {
        const {
            type = 'info',
            duration = 3000,
            position = 'top-right',
        } = options;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type} animate-notification-in`;
        toast.style.cssText = `
            position: fixed;
            ${position.includes('top') ? 'top: 20px' : 'bottom: 20px'};
            ${position.includes('right') ? 'right: 20px' : 'left: 20px'};
            background: ${getToastBackground(type)};
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
            max-width: 400px;
            z-index: 10000;
            border-left: 4px solid ${getToastBorderColor(type)};
            display: flex;
            align-items: center;
            gap: 12px;
        `;

        const icon = document.createElement('span');
        icon.style.cssText = 'font-size: 20px;';
        icon.textContent = getToastIcon(type);

        const content = document.createElement('span');
        content.textContent = message;

        toast.appendChild(icon);
        toast.appendChild(content);

        document.body.appendChild(toast);

        if (duration > 0) {
            setTimeout(() => {
                toast.classList.remove('animate-notification-in');
                toast.classList.add('animate-notification-out');
                setTimeout(() => toast.remove(), ANIMATION_DURATION);
            }, duration);
        }

        return toast;
    }

    /**
     * Crea un spinner de carga.
     */
    function createSpinner(options = {}) {
        const {
            size = 'md',
            color = '#25D366',
        } = options;

        const sizeMap = {
            sm: '24px',
            md: '48px',
            lg: '64px',
        };

        const spinner = document.createElement('div');
        spinner.className = 'spinner animate-spin';
        spinner.style.cssText = `
            width: ${sizeMap[size] || sizeMap.md};
            height: ${sizeMap[size] || sizeMap.md};
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top-color: ${color};
            border-radius: 50%;
        `;

        return spinner;
    }

    /**
     * Crea un skeleton loader.
     */
    function createSkeleton(options = {}) {
        const {
            width = '100%',
            height = '20px',
            count = 1,
        } = options;

        const container = document.createElement('div');
        container.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';

        for (let i = 0; i < count; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton';
            skeleton.style.cssText = `
                width: ${width};
                height: ${height};
                background: linear-gradient(
                    90deg,
                    rgba(255, 255, 255, 0.1) 0%,
                    rgba(255, 255, 255, 0.2) 50%,
                    rgba(255, 255, 255, 0.1) 100%
                );
                background-size: 200% 100%;
                border-radius: 8px;
                animation: shimmer 2s infinite;
            `;
            container.appendChild(skeleton);
        }

        return container;
    }

    /**
     * Crea un tooltip.
     */
    function createTooltip(element, text, position = 'top') {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = text;
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            white-space: nowrap;
            pointer-events: none;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s;
        `;

        element.addEventListener('mouseenter', () => {
            document.body.appendChild(tooltip);
            const rect = element.getBoundingClientRect();

            if (position === 'top') {
                tooltip.style.top = (rect.top - 40) + 'px';
                tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
            } else if (position === 'bottom') {
                tooltip.style.top = (rect.bottom + 10) + 'px';
                tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
            } else if (position === 'left') {
                tooltip.style.top = (rect.top + rect.height / 2 - tooltip.offsetHeight / 2) + 'px';
                tooltip.style.left = (rect.left - tooltip.offsetWidth - 10) + 'px';
            } else if (position === 'right') {
                tooltip.style.top = (rect.top + rect.height / 2 - tooltip.offsetHeight / 2) + 'px';
                tooltip.style.left = (rect.right + 10) + 'px';
            }

            setTimeout(() => tooltip.style.opacity = '1', 10);
        });

        element.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
            setTimeout(() => tooltip.remove(), 300);
        });
    }

    /**
     * Crea un dropdown menu.
     */
    function createDropdown(trigger, items = []) {
        const dropdown = document.createElement('div');
        dropdown.className = 'dropdown';
        dropdown.style.cssText = `
            position: relative;
            display: inline-block;
        `;

        const menu = document.createElement('div');
        menu.className = 'dropdown-menu';
        menu.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            background: #0f1419;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
            min-width: 200px;
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
            transition: all 0.3s;
            z-index: 1000;
            margin-top: 8px;
        `;

        items.forEach((item) => {
            const menuItem = document.createElement('button');
            menuItem.textContent = item.label;
            menuItem.style.cssText = `
                display: block;
                width: 100%;
                padding: 12px 16px;
                background: none;
                border: none;
                color: #b0b3c1;
                text-align: left;
                cursor: pointer;
                transition: all 0.2s;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            `;
            menuItem.onmouseover = () => {
                menuItem.style.background = 'rgba(37, 211, 102, 0.1)';
                menuItem.style.color = '#25D366';
            };
            menuItem.onmouseout = () => {
                menuItem.style.background = 'none';
                menuItem.style.color = '#b0b3c1';
            };
            menuItem.onclick = () => {
                if (item.onClick) item.onClick();
                menu.style.opacity = '0';
                menu.style.visibility = 'hidden';
            };
            menu.appendChild(menuItem);
        });

        dropdown.appendChild(trigger);
        dropdown.appendChild(menu);

        trigger.onclick = (e) => {
            e.stopPropagation();
            menu.style.opacity = menu.style.opacity === '0' ? '1' : '0';
            menu.style.visibility = menu.style.visibility === 'hidden' ? 'visible' : 'hidden';
            menu.style.transform = menu.style.opacity === '1' ? 'translateY(0)' : 'translateY(-10px)';
        };

        document.addEventListener('click', () => {
            menu.style.opacity = '0';
            menu.style.visibility = 'hidden';
        });

        return dropdown;
    }

    /**
     * Crea un badge.
     */
    function createBadge(text, type = 'primary') {
        const badge = document.createElement('span');
        badge.className = `badge badge-${type}`;
        badge.textContent = text;
        badge.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        `;
        return badge;
    }

    /**
     * Crea una alerta.
     */
    function createAlert(message, type = 'info') {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.style.cssText = `
            padding: 16px;
            border-radius: 8px;
            border-left: 4px solid;
            display: flex;
            gap: 12px;
            align-items: flex-start;
            margin-bottom: 16px;
        `;

        const icon = document.createElement('span');
        icon.style.cssText = 'font-size: 20px; flex-shrink: 0;';
        icon.textContent = getAlertIcon(type);

        const content = document.createElement('div');
        content.innerHTML = message;

        alert.appendChild(icon);
        alert.appendChild(content);

        return alert;
    }

    /**
     * Crea un progreso bar.
     */
    function createProgressBar(options = {}) {
        const {
            value = 0,
            max = 100,
            color = '#25D366',
            animated = true,
        } = options;

        const container = document.createElement('div');
        container.style.cssText = `
            width: 100%;
            height: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            overflow: hidden;
        `;

        const bar = document.createElement('div');
        bar.style.cssText = `
            height: 100%;
            background: linear-gradient(90deg, ${color}, ${color}dd);
            width: ${(value / max) * 100}%;
            transition: width 0.3s ease;
            ${animated ? 'animation: shimmer 2s infinite;' : ''}
        `;

        container.appendChild(bar);
        container.updateProgress = (newValue) => {
            bar.style.width = `${(newValue / max) * 100}%`;
        };

        return container;
    }

    /* ── Utilidades ──────────────────────────────────────────– */

    function getToastBackground(type) {
        const backgrounds = {
            success: 'rgba(37, 211, 102, 0.9)',
            error: 'rgba(255, 68, 68, 0.9)',
            warning: 'rgba(255, 165, 0, 0.9)',
            info: 'rgba(33, 150, 243, 0.9)',
        };
        return backgrounds[type] || backgrounds.info;
    }

    function getToastBorderColor(type) {
        const colors = {
            success: '#25D366',
            error: '#ff4444',
            warning: '#ffa500',
            info: '#2196F3',
        };
        return colors[type] || colors.info;
    }

    function getToastIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ',
        };
        return icons[type] || icons.info;
    }

    function getAlertIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ',
        };
        return icons[type] || icons.info;
    }

    /* ── Exportación ─────────────────────────────────────────── */
    global.UI_COMPONENTS = Object.freeze({
        createModal,
        createToast,
        createSpinner,
        createSkeleton,
        createTooltip,
        createDropdown,
        createBadge,
        createAlert,
        createProgressBar,
    });

})(window);
