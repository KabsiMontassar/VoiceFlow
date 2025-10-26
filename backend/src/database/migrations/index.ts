import { Sequelize } from 'sequelize';
import * as migration001 from './001-add-friendcode-to-users';
import * as migration002 from './002-update-friendcode-length';
import * as migration003 from './003-add-bio-to-users';
import * as migration004 from './004-create-user-settings';

interface Migration {
  name: string;
  up: (queryInterface: any) => Promise<void>;
  down: (queryInterface: any) => Promise<void>;
}

const migrations: Migration[] = [
  {
    name: '001-add-friendcode-to-users',
    up: migration001.up,
    down: migration001.down,
  },
  {
    name: '002-update-friendcode-length',
    up: migration002.up,
    down: migration002.down,
  },
  {
    name: '003-add-bio-to-users',
    up: migration003.up,
    down: migration003.down,
  },
  {
    name: '004-create-user-settings',
    up: migration004.up,
    down: migration004.down,
  },
];

export async function runMigrations(sequelize: Sequelize): Promise<void> {
  const queryInterface = sequelize.getQueryInterface();

  // Create migrations table if it doesn't exist
  try {
    await queryInterface.createTable('sequelize_migrations', {
      name: {
        type: 'VARCHAR(255)',
        allowNull: false,
        primaryKey: true,
      },
      executed_at: {
        type: 'TIMESTAMP',
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  } catch (error: any) {
    // Table already exists, ignore error
    if (!error.message?.includes('already exists')) {
      throw error;
    }
  }

  // Get already executed migrations
  const [executedMigrations] = await sequelize.query(
    'SELECT name FROM sequelize_migrations'
  );

  const executedNames = new Set(
    (executedMigrations as any[]).map((m) => m.name)
  );

  // Run pending migrations
  for (const migration of migrations) {
    if (!executedNames.has(migration.name)) {
      console.log(`Running migration: ${migration.name}`);
      
      try {
        await migration.up(queryInterface);
        
        // Record migration as executed
        await sequelize.query(
          'INSERT INTO sequelize_migrations (name) VALUES (:name)',
          { replacements: { name: migration.name } }
        );
        
        console.log(`✓ Migration ${migration.name} completed`);
      } catch (error) {
        console.error(`✗ Migration ${migration.name} failed:`, error);
        throw error;
      }
    }
  }
}
