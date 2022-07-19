/*
 * LiskHQ/lisk-service
 * Copyright © 2019 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */

module.exports = {
    apps: [
        {
            name: 'lisk-core',
            script: './bin/run',
            args: 'start',
            env: {
                LISK_NETWORK: "mainnet",
                LISK_API_IPC: "true",
            },
            pid_file: './pids/lisk-core.pid',
            out_file: './logs/lisk-core.log',
            error_file: './logs/lisk-core.err',
            log_date_format: 'YYYY-MM-DD HH:mm:ss SSS',
        },
    ],
    deploy: {
        local: {
            "user": "lisk",
            "host": ["127.0.0.1"],
            "ref": "origin/main",
            "repo": "https://github.com/nagdahimanshu/lisk-core.git",
            "path": ".",
            "post-setup": "npm ci && npm run build",
            "post-deploy": "pm2 start ecosystem.config.js"
        }
    }
};
