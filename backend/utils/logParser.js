/**
 * Log Parser Utility
 * Parse nginx-style access logs
 */

class LogParser {
    /**
     * Parse a single log line in nginx combined format
     * Format: IP - - [timestamp] "METHOD PATH PROTOCOL" STATUS SIZE "REFERER" "USER_AGENT"
     */
    static parseLogLine(line) {
        if (!line || !line.trim()) {
            return null;
        }

        try {
            // Pattern pour nginx combined format
            // IP - - [timestamp] "METHOD PATH PROTOCOL" STATUS SIZE "REFERER" "USER_AGENT"
            const pattern = /^(\S+)\s+-\s+-\s+\[([^\]]+)\]\s+"(\S+)\s+(\S+)\s+([^"]+)"\s+(\d+)\s+(\S+)\s+"([^"]*)"\s+"([^"]*)"$/;
            
            const match = line.match(pattern);
            
            if (!match) {
                // Try simpler format without referer/user-agent
                const simplePattern = /^(\S+)\s+-\s+-\s+\[([^\]]+)\]\s+"(\S+)\s+(\S+)\s+([^"]+)"\s+(\d+)\s+(\S+)/;
                const simpleMatch = line.match(simplePattern);
                
                if (simpleMatch) {
                    return {
                        ip: simpleMatch[1],
                        timestamp: simpleMatch[2],
                        method: simpleMatch[3],
                        path: simpleMatch[4],
                        protocol: simpleMatch[5],
                        status: parseInt(simpleMatch[6]),
                        size: simpleMatch[7] === '-' ? 0 : parseInt(simpleMatch[7]) || 0,
                        referer: '-',
                        userAgent: '-',
                        raw: line
                    };
                }
                
                return null;
            }

            return {
                ip: match[1],
                timestamp: match[2],
                method: match[3],
                path: match[4],
                protocol: match[5],
                status: parseInt(match[6]),
                size: match[7] === '-' ? 0 : parseInt(match[7]) || 0,
                referer: match[8] || '-',
                userAgent: match[9] || '-',
                raw: line
            };
        } catch (error) {
            console.error('Error parsing log line:', error);
            return null;
        }
    }

    /**
     * Parse multiple log lines
     */
    static parseLogLines(logText) {
        if (!logText) {
            return [];
        }

        const lines = logText.split('\n').filter(line => line.trim());
        const parsedLogs = [];

        for (const line of lines) {
            const parsed = this.parseLogLine(line);
            if (parsed) {
                parsedLogs.push(parsed);
            }
        }

        return parsedLogs;
    }

    /**
     * Analyze logs and generate statistics
     */
    static analyzeLogs(logs) {
        if (!logs || logs.length === 0) {
            return {
                total: 0,
                byStatus: {},
                byMethod: {},
                byPath: {},
                byIP: {},
                statusCodes: [],
                methods: [],
                paths: [],
                ips: [],
                totalSize: 0,
                averageSize: 0,
                timeRange: null
            };
        }

        const stats = {
            total: logs.length,
            byStatus: {},
            byMethod: {},
            byPath: {},
            byIP: {},
            statusCodes: [],
            methods: [],
            paths: [],
            ips: [],
            totalSize: 0,
            averageSize: 0,
            timeRange: {
                start: null,
                end: null
            }
        };

        const timestamps = [];

        for (const log of logs) {
            // Count by status
            stats.byStatus[log.status] = (stats.byStatus[log.status] || 0) + 1;

            // Count by method
            stats.byMethod[log.method] = (stats.byMethod[log.method] || 0) + 1;

            // Count by path (simplified - just the endpoint)
            const path = log.path.split('?')[0]; // Remove query params
            stats.byPath[path] = (stats.byPath[path] || 0) + 1;

            // Count by IP
            stats.byIP[log.ip] = (stats.byIP[log.ip] || 0) + 1;

            // Size
            stats.totalSize += log.size;

            // Timestamps
            try {
                // Parse nginx timestamp format: [12/Nov/2025:16:14:56 +0000]
                const timestampMatch = log.timestamp.match(/\[(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})\s+([^\]]+)\]/);
                if (timestampMatch) {
                    const dateStr = `${timestampMatch[1]} ${timestampMatch[2]} ${timestampMatch[3]} ${timestampMatch[4]}:${timestampMatch[5]}:${timestampMatch[6]}`;
                    const date = new Date(dateStr);
                    if (!isNaN(date.getTime())) {
                        timestamps.push(date);
                    }
                }
            } catch (e) {
                // Ignore timestamp parsing errors
            }
        }

        // Convert to arrays and sort
        stats.statusCodes = Object.entries(stats.byStatus)
            .map(([code, count]) => ({ code: parseInt(code), count }))
            .sort((a, b) => b.count - a.count);

        stats.methods = Object.entries(stats.byMethod)
            .map(([method, count]) => ({ method, count }))
            .sort((a, b) => b.count - a.count);

        stats.paths = Object.entries(stats.byPath)
            .map(([path, count]) => ({ path, count }))
            .sort((a, b) => b.count - a.count);

        stats.ips = Object.entries(stats.byIP)
            .map(([ip, count]) => ({ ip, count }))
            .sort((a, b) => b.count - a.count);

        stats.averageSize = stats.total > 0 ? Math.round(stats.totalSize / stats.total) : 0;

        // Time range
        if (timestamps.length > 0) {
            timestamps.sort((a, b) => a - b);
            stats.timeRange.start = timestamps[0].toISOString();
            stats.timeRange.end = timestamps[timestamps.length - 1].toISOString();
        }

        return stats;
    }

    /**
     * Filter logs based on criteria
     */
    static filterLogs(logs, filters) {
        if (!logs || logs.length === 0) {
            return [];
        }

        let filtered = [...logs];

        if (filters.ip) {
            filtered = filtered.filter(log => log.ip.includes(filters.ip));
        }

        if (filters.status) {
            filtered = filtered.filter(log => log.status === parseInt(filters.status));
        }

        if (filters.method) {
            filtered = filtered.filter(log => log.method === filters.method);
        }

        if (filters.path) {
            filtered = filtered.filter(log => log.path.includes(filters.path));
        }

        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(log => 
                log.path.toLowerCase().includes(searchLower) ||
                log.ip.toLowerCase().includes(searchLower) ||
                log.userAgent.toLowerCase().includes(searchLower) ||
                log.method.toLowerCase().includes(searchLower)
            );
        }

        return filtered;
    }
}

module.exports = LogParser;








