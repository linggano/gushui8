const securityConfig = require('../../config/security');

function scanRoutes(app, options = {}) {
    const { excludePublicPaths = true, customExcludePaths = [] } = options;

    const excludePatterns = [
        ...(excludePublicPaths ? securityConfig.publicPaths : []),
        ...customExcludePaths,
    ];

    const routes = [];
    const seen = new Set();

    function collectFromStack(stack, basePath) {
        if (!stack) return;

        for (const layer of stack) {
            if (layer.route) {
                const routePath = normalizePath(basePath + layer.route.path);
                const methods = Object.keys(layer.route.methods)
                    .filter(m => layer.route.methods[m])
                    .map(m => m.toUpperCase());

                if (methods.length > 0 && !seen.has(routePath)) {
                    if (!isExcluded(routePath, excludePatterns)) {
                        seen.add(routePath);
                        routes.push({ path: routePath, methods });
                    }
                }
            } else if (layer.handle && layer.handle.stack) {
                collectFromStack(layer.handle.stack, basePath);
            }
        }
    }

    function collectFromRouter(handle, basePath) {
        if (handle.subModules) {
            handle.subModules.forEach(({ prefix, router: subRouter }) => {
                const fullPath = basePath + prefix;
                if (subRouter.stack) {
                    collectFromStack(subRouter.stack, fullPath);
                }
                collectFromRouter(subRouter, fullPath);
            });
            return;
        }

        if (handle.stack) {
            collectFromStack(handle.stack, basePath);
        }
    }

    const moduleRouter = findModuleRouter(app);
    if (moduleRouter) {
        const moduleConfigs = moduleRouter.modules || [];

        moduleConfigs.forEach(({ prefix }) => {
            const subRouter = findSubRouter(moduleRouter, prefix);
            if (subRouter) {
                collectFromRouter(subRouter.handle, prefix);
            }
        });
    }

    return routes;
}

function findModuleRouter(app) {
    const router = app.router || app._router;
    if (!router || !router.stack) return null;

    for (const layer of router.stack) {
        if (layer.handle && layer.handle.modules) {
            return layer.handle;
        }
    }
    return null;
}

function findSubRouter(moduleRouter, prefix) {
    if (!moduleRouter.stack) return null;

    for (const layer of moduleRouter.stack) {
        if (layer.matchers && layer.matchers.length > 0 && layer.handle && layer.handle.stack) {
            const result = layer.matchers[0](prefix + '/__test__');
            if (result && result.path === prefix) {
                return layer;
            }
        }
    }
    return null;
}

function normalizePath(p) {
    return p.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}

function isExcluded(routePath, patterns) {
    return patterns.some(pattern => {
        if (pattern === routePath) return true;
        if (pattern.endsWith('*') || pattern.endsWith('/')) {
            const cleanPrefix = pattern.replace(/\/?\*?$/, '');
            return routePath === cleanPrefix || routePath.startsWith(cleanPrefix + '/');
        }
        return routePath.startsWith(pattern);
    });
}

module.exports = { scanRoutes };