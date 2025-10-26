import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  const transaction = await queryInterface.sequelize.transaction();
  
  try {
    // Check if table already exists
    const tables = await queryInterface.showAllTables();
    
    if (!tables.includes('user_settings')) {
      // Create user_settings table
      await queryInterface.createTable('user_settings', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: true,
          references: {
            model: 'users',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        allowFriendRequests: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
          allowNull: false,
        },
        showOnlineStatus: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
          allowNull: false,
        },
        createdAt: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
        },
      }, { transaction });

      // Create index on userId
      await queryInterface.addIndex('user_settings', ['userId'], {
        unique: true,
        transaction,
      });

      // Create default settings for existing users
      await queryInterface.sequelize.query(`
        INSERT INTO user_settings (id, "userId", "allowFriendRequests", "showOnlineStatus", "createdAt", "updatedAt")
        SELECT 
          gen_random_uuid(),
          u.id,
          true,
          true,
          NOW(),
          NOW()
        FROM users u
        WHERE NOT EXISTS (
          SELECT 1 FROM user_settings us WHERE us."userId" = u.id
        )
      `, { transaction });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  const transaction = await queryInterface.sequelize.transaction();
  
  try {
    await queryInterface.dropTable('user_settings', { transaction });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
