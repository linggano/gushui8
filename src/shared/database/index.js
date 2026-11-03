const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');

const defineAssociations = require('./associations');

const dialect = process.env.DATABASE_DIALECT || 'sqlite';
const storage = process.env.DATABASE_STORAGE || path.join(process.cwd(), 'database.sqlite');

const sequelize = new Sequelize({
    dialect,
    storage,
    logging: process.env.DATABASE_LOGGING !== 'false' ? console.log : false,
    pool: {
        max: parseInt(process.env.DATABASE_POOL_MAX, 10) || 5,
        min: parseInt(process.env.DATABASE_POOL_MIN, 10) || 0,
        acquire: parseInt(process.env.DATABASE_POOL_ACQUIRE, 10) || 30000,
        idle: parseInt(process.env.DATABASE_POOL_IDLE, 10) || 10000,
    },
});

function loadModelsFromDir(dir) {
    const loaded = {};
    if (!fs.existsSync(dir)) return loaded;

    fs.readdirSync(dir)
        .filter(f => f.endsWith('.js') && f !== 'index.js')
        .forEach(file => {
            const factory = require(path.join(dir, file));
            const model = factory(sequelize, DataTypes, Sequelize.Model);
            if (model && model.name) {
                loaded[model.name] = model;
            }
        });

    return loaded;
}

const models = {
    ...loadModelsFromDir(path.join(__dirname, 'models')),
};

const modulesDir = path.join(__dirname, '..', '..', 'modules');
if (fs.existsSync(modulesDir)) {
    fs.readdirSync(modulesDir).forEach(moduleName => {
        const moduleModelsDir = path.join(modulesDir, moduleName, 'models');
        Object.assign(models, loadModelsFromDir(moduleModelsDir));
    });
}

defineAssociations(models);

Object.assign(models, { sequelize, Sequelize, DataTypes });

module.exports = models;