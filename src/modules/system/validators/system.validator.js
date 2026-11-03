const { param } = require('express-validator');

const BACKUP_FILENAME_REGEX = /^backup_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.sqlite$/;

class SystemValidator {

    static filenameRules() {
        return [
            param('filename')
                .trim()
                .notEmpty().withMessage('文件名不能为空')
                .custom(value => {
                    if (value.includes('..') || value.includes('/') || value.includes('\\')) {
                        throw new Error('文件名包含非法字符');
                    }
                    return true;
                })
                .custom(value => {
                    if (!value.endsWith('.sqlite')) {
                        throw new Error('仅允许 .sqlite 格式的备份文件');
                    }
                    return true;
                })
                .matches(BACKUP_FILENAME_REGEX)
                .withMessage('备份文件名格式不正确，应为 backup_YYYY-MM-DDTHH-mm-ss-SSSZ.sqlite'),
        ];
    }
}

module.exports = SystemValidator;