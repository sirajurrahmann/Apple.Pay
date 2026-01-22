// Common JavaScript for Payment Pages

// -------------------------------------------------------------------
// Shared Data & Constants
// -------------------------------------------------------------------
const browserInfo = {
    userAgentHeader: navigator.userAgent,
    acceptHeader: '*/*',
    formTargetId: 'secure3dIFrame',
    browserColorDepthBits: screen.colorDepth?.toString() || '',
    browserJavaEnabled: navigator.javaEnabled().toString(),
    browserLanguage: navigator.language || '',
    browserScreenHeight: screen.height?.toString() || '',
    browserScreenWidth: screen.width?.toString() || '',
    browserUtcOffset: new Date().getTimezoneOffset().toString()
};

const billingInfo = {
    name: {
        firstName: 'siraj',
        lastName: 'ur rahman'
    },
    address: {
        multiLineText: '234\n440000\nPakistan',
        singleLineText: '234, 440000, Pakistan',
        isInternational: true,
        line1: '234',
        postalCode: '440000',
        locality: 'islamabad',
        country: 'PK'
    },
    email: {
        address: 'siraj.urrahman@n3o.ltd'
    },
    telephone: {
        country: 'PK',
        number: '3335183701'
    }
};

const account = {
    type: 'individual',
    firstName: 'Siraj',
    lastName: 'ur Rehman',
    email: 'testimpoort@yopmail.com',
    address: {
        multiLineText: '234\nislamabad\n440000\nPakistan',
        singleLineText: '234, islamabad, 440000, Pakistan',
        isInternational: true,
        locality: 'islamabad',
        line1: '234',
        postalCode: '440000',
        country: 'PK'
    },
    id: '5b65a92f-42d9-43d7-b842-f60d81b5ce19',
    reference: {
        type: 'AC',
        number: 1000206,
        text: 'AC1000206'
    },
    name: 'Mr Siraj ur Rehman',
    initials: 'Su',
    color: '#FFA940'
};

// -------------------------------------------------------------------
// Helper Functions
// -------------------------------------------------------------------

function log(message, data) {
    const logBox = document.getElementById("log");
    if (!logBox) {
        console.log(message, data);
        return;
    }
    const timestamp = new Date().toISOString();
    let text = `[${timestamp}] ${message}`;

    if (data) {
        console.log(message, data);
        text += "\n" + JSON.stringify(data, null, 2);
    } else {
        console.log(message);
    }

    logBox.textContent += text + "\n\n";
    logBox.scrollTop = logBox.scrollHeight;
}

function normalizeBaseUrl(value) {
    return (value || '').trim().replace(/\/+$/g, '');
}

function normalizePrefix(value) {
    const v = (value || '').trim();
    if (!v) return '';
    if (v === '/') return '';
    return `/${v.replace(/^\/+/, '').replace(/\/+$/, '')}`;
}

function buildEndpoint(path) {
    const serverBase = normalizeBaseUrl(document.getElementById('serverBase').value);
    const apiPrefix = normalizePrefix(document.getElementById('apiPrefix').value);
    const p = `/${(path || '').replace(/^\/+/, '')}`;
    if (!serverBase) {
        throw new Error('Error: Server Base URL is required');
    }
    return `${serverBase}${apiPrefix}${p}`;
}

function buildHeaders(ignoreValidationWarnings) {
    const headers = {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'N3O-Ignore-Validation-Warnings': ignoreValidationWarnings ? 'true' : 'false'
    };

    const bearerTokenEl = document.getElementById('bearerToken');
    const bearer = (bearerTokenEl?.value || '').trim();
    if (bearer) {
        headers['Authorization'] = bearer;
    }

    const subscriptionId = (document.getElementById('subscriptionId')?.value || '').trim();
    if (subscriptionId) {
        headers['N3O-Subscription-Id'] = subscriptionId;
    }

    return headers;
}

function getMethodId() {
    const methodId = (document.getElementById('methodId').value || '').trim();
    if (!methodId) {
        throw new Error('Error: Method Id is required');
    }
    return methodId;
}

function debounce(fn, ms) {
    let timer;
    return (...args) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}

function loadJS(FILE_URL, async = true, onLoadAction = () => { }) {
    let scriptEle = document.createElement("script");

    scriptEle.setAttribute("src", FILE_URL);
    scriptEle.setAttribute("type", "text/javascript");
    scriptEle.setAttribute("async", async);
    document.body.appendChild(scriptEle);

    scriptEle.addEventListener("load", () => {
        onLoadAction();
    });

    scriptEle.addEventListener("error", (ev) => {
        console.log("Error on loading file", ev);
    });
}

function copyJson() {
    const textarea = document.getElementById("paymentJson");
    if (textarea) {
        textarea.select();
        document.execCommand("copy");
        alert("JSON copied to clipboard");
    }
}

// -------------------------------------------------------------------
// Configuration Logic
// -------------------------------------------------------------------

function readConfigFromInputs() {
    return {
        serverBase: document.getElementById('serverBase').value,
        apiPrefix: document.getElementById('apiPrefix').value,
        methodId: document.getElementById('methodId').value,
        subscriptionId: document.getElementById('subscriptionId').value,
        bearerToken: document.getElementById('bearerToken').value
    };
}

function writeConfigToSession(sessionKey, config) {
    sessionStorage.setItem(sessionKey, JSON.stringify(config));
}

function readConfigFromSession(sessionKey) {
    try {
        const raw = sessionStorage.getItem(sessionKey);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function applyConfigToInputs(config) {
    if (!config) return;
    const assign = (id, value) => {
        if (value === undefined || value === null) return;
        const el = document.getElementById(id);
        if (el && !el.value) el.value = value;
    };

    assign('serverBase', config.serverBase);
    assign('apiPrefix', config.apiPrefix);
    assign('methodId', config.methodId);
    assign('subscriptionId', config.subscriptionId);
    assign('bearerToken', config.bearerToken);
}

function setupConfigPersistence(sessionKey) {
    // Load config from session
    const savedConfig = readConfigFromSession(sessionKey);
    if (savedConfig) {
        applyConfigToInputs(savedConfig);
    }

    // Save config on change
    const saveConfigDebounced = debounce(() => {
        writeConfigToSession(sessionKey, readConfigFromInputs());
    }, 500);

    ['serverBase', 'apiPrefix', 'methodId', 'subscriptionId', 'bearerToken'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', saveConfigDebounced);
        }
    });
}

// -------------------------------------------------------------------
// Dynamic UI Generation (Optional but recommended for reuse)
// -------------------------------------------------------------------

function renderGenericFields(containerId, defaults = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const fields = [
        { id: 'serverBase', label: 'Server Base', type: 'url', value: defaults.serverBase || 'http://localhost:25713' },
        { id: 'apiPrefix', label: 'API Prefix', type: 'text', value: defaults.apiPrefix || '' },
        { id: 'methodId', label: 'Method ID', type: 'text', value: defaults.methodId || '' },
        { id: 'subscriptionId', label: 'Subscription ID', type: 'text', value: defaults.subscriptionId || '00000006-0000-0000-0000-000000000000' },
        { id: 'bearerToken', label: 'Bearer Token', type: 'text', placeholder: 'Authorization (Bearer ...)', value: defaults.bearerToken || '' }
    ];

    let html = '';
    fields.forEach(field => {
        html += `<label for="${field.id}">${field.label}</label>`;
        html += `<input id="${field.id}" type="${field.type}" value="${field.value}" placeholder="${field.placeholder || ''}" />`;
    });

    // If there is a hidden input for methodId (like in 3DS pages), we should handle it. 
    // But for now, we assume standard inputs.

    container.innerHTML = html;
}


function processFlowPaymentAsync(url, methodId, requestAction) {
    const flowParameters = {
        flowId: "",
        flowRevision: 1,
        scopeId: '',
        billingInfo: billingInfo,
        namedParameters: {
            methodId: methodId
        }
    };

    const paymentData = {
        account: account,
        Parameters: flowParameters,
        Request: {
            date: '2025-12-22',
            value: {
                currency: 'GBP',
                amount: 10
            },
            idempotencyKey: '123'
        }
    };

    if (requestAction) {
        requestAction(paymentData);
    }

    return fetch(url, {
        method: 'POST',
        headers: buildHeaders(true),
        body: JSON.stringify(paymentData),
    }).then(res => res.json());
}
