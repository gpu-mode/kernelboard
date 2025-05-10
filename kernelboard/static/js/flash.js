document.addEventListener('DOMContentLoaded', () => {
    const toastContainer = document.getElementById('toast-container-default');

    // Select templates for the default category.
    const templates = document.querySelectorAll('.toast-template-default');

    if (!toastContainer) {
        return; // Exit if container doesn't exist.
    }

    templates.forEach(template => {
        const toast = document.createElement('div');

        // Apply base and category-specific classes defined in input.css.
        toast.className = 'toast-default'; // Base class with styles.
        toast.setAttribute('role', 'status'); // Non-assertive for default messages.
        toast.setAttribute('aria-live', 'polite');

        // Apply the fade-in animation.
        toast.classList.add('animate-toast-in');

        const message = template.dataset.message;

        toast.innerHTML = `
            <div class="toast-default-content">
                <div class="toast-default-message">
                    <p>${message}</p>
                </div>
                <div class="toast-default-close-btn">
                    <button type="button" class="toast-close-btn">
                        <span class="sr-only">Close</span>
                        <span aria-hidden="true">&#x2716;</span>
                    </button>
                </div>
            </div>
        `;

        // Add close functionality.
        const closeButton = toast.querySelector('.toast-close-btn');
        closeButton.addEventListener('click', () => {
            dismissToast(toast);
        });

        // Auto-dismiss timer.
        const timerId = setTimeout(() => {
            dismissToast(toast);
        }, 5000); // Dismiss after 5 seconds.

        // Store timerId to clear if closed manually.
        toast.dataset.timerId = timerId;

        // Prepend to container.
        toastContainer.insertBefore(toast, toastContainer.firstChild);
    });

    function dismissToast(toast) {
        if (toast.dataset.timerId) {
            clearTimeout(parseInt(toast.dataset.timerId));
        }

        // Add fade-out animation class.
        toast.classList.remove('animate-toast-in');
        toast.classList.add('animate-toast-out');

        // Remove the element after the animation completes.
        toast.addEventListener('animationend', () => {
            if (toast.parentNode) {
                toast.remove();
            }
        });

        // Fallback removal in case animationend doesn't fire reliably.
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 500);
    }
}); 