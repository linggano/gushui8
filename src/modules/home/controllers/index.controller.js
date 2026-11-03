

class IndexController {
    // ============================================================
    // 1. 首页
    // ============================================================
    renderIndex = async (req, res) => {
        res.render('home/index', {
            title: '首页',
            breadcrumb: [
                { label: '首页' },
            ],
            user: res.locals.user || null,
            userRoles: res.locals.userRoles || [],
            userPermissions: res.locals.userPermissions || [],
        });
    }


    // ============================================================
    // 2. 使用帮助
    // ============================================================
    renderHelp = async (req, res) => {
        res.render('home/help', {
            title: '使用帮助',
            breadcrumb: [
                { label: '首页' },
                { label: '使用帮助' },
            ],
        });
    }
}

module.exports = new IndexController();
