import { Sequelize } from 'sequelize';
import config from '../config/index';
import { initializeModels } from '../models/index';

let sequelize: Sequelize | null = null;

export const initializeDatabase = async (): Promise<Sequelize> => {
  if (sequelize) {
    return sequelize;
  }

  sequelize = new Sequelize(config.DATABASE_URL, {
    dialect: 'postgres',
    logging: config.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });

  try {
    await sequelize.authenticate();
    console.log('Database connection established');

    // Initialize all models
    initializeModels(sequelize);

    // Sync models with database
    if (config.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('Database models synchronized');
    }

    return sequelize;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

export const getDatabase = (): Sequelize => {
  if (!sequelize) {
    throw new Error('Database not initialized');
  }
  return sequelize;
};

export const closeDatabase = async (): Promise<void> => {
  if (sequelize) {
    await sequelize.close();
    sequelize = null;
  }
};

export default {
  initializeDatabase,
  getDatabase,
  closeDatabase,
};
