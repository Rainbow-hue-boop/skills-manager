#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const child_process_1 = require("child_process");
const PORT_FILE = path_1.default.join(os_1.default.homedir(), '.skills-manager', '.ipc-port');
const PENDING_PATH_FILE = path_1.default.join(os_1.default.homedir(), '.skills-manager', '.pending-path');
const cwd = process.cwd();
function getStoredPort() {
    try {
        const portStr = fs_1.default.readFileSync(PORT_FILE, 'utf-8').trim();
        const port = parseInt(portStr);
        return Number.isNaN(port) ? null : port;
    }
    catch {
        return null;
    }
}
function sendOpenRequest(port) {
    return new Promise(resolve => {
        const req = http_1.default.get(`http://127.0.0.1:${port}/open?path=${encodeURIComponent(cwd)}`, res => {
            let body = '';
            res.on('data', (chunk) => { body += chunk.toString(); });
            res.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    resolve(data.status === 'ok');
                }
                catch {
                    resolve(false);
                }
            });
        });
        req.on('error', () => resolve(false));
        req.setTimeout(3000, () => { req.destroy(); resolve(false); });
    });
}
function launchElectron() {
    // Write pending path BEFORE launching, so Electron can read it on startup
    const dir = path_1.default.join(os_1.default.homedir(), '.skills-manager');
    fs_1.default.mkdirSync(dir, { recursive: true });
    fs_1.default.writeFileSync(PENDING_PATH_FILE, cwd, 'utf-8');
    const possiblePaths = [
        path_1.default.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
        path_1.default.join(__dirname, '..', '..', 'node_modules', '.bin', 'electron'),
    ];
    for (const p of possiblePaths) {
        if (fs_1.default.existsSync(p) || fs_1.default.existsSync(p + '.cmd')) {
            (0, child_process_1.execSync)(`"${p}" "${path_1.default.join(__dirname, '..')}"`, { stdio: 'inherit', cwd: path_1.default.join(__dirname, '..') });
            return;
        }
    }
    console.error('Cannot find Electron binary. Run from within skills-manager project or install globally.');
    process.exit(1);
}
async function main() {
    const port = getStoredPort();
    if (port) {
        const ok = await sendOpenRequest(port);
        if (ok)
            return;
    }
    launchElectron();
}
main();
