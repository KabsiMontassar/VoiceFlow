import { QueryInterface, DataTypes } from 'sequelize';
import { generateFriendCode } from '../../utils/codeGenerator';

export async function up(queryInterface: QueryInterface): Promise<void> {
  const transaction = await queryInterface.sequelize.transaction();
  
  try {
    // Check if the column already exists
    const tableDescription = await queryInterface.describeTable('users');
    
    if (!tableDescription.friendCode) {
      // Step 1: Add column as nullable first
      await queryInterface.addColumn('users', 'friendCode', {
        type: DataTypes.STRING(12),
        allowNull: true,
        unique: true,
      }, { transaction });

      // Step 2: Generate friend codes for existing users
      const [users] = await queryInterface.sequelize.query(
        'SELECT id FROM users WHERE "friendCode" IS NULL',
        { transaction }
      );

      for (const user of users as any[]) {
        let friendCode = '';
        let isUnique = false;

        // Generate unique friend code
        while (!isUnique) {
          friendCode = generateFriendCode();
          const [existing] = await queryInterface.sequelize.query(
            'SELECT id FROM users WHERE "friendCode" = :friendCode',
            { replacements: { friendCode }, transaction }
          );
          isUnique = (existing as any[]).length === 0;
        }

        await queryInterface.sequelize.query(
          'UPDATE users SET "friendCode" = :friendCode WHERE id = :id',
          { replacements: { friendCode, id: user.id }, transaction }
        );
      }

      // Step 3: Make column NOT NULL after all users have friend codes
      await queryInterface.changeColumn('users', 'friendCode', {
        type: DataTypes.STRING(12),
        allowNull: false,
        unique: true,
      }, { transaction });
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
    // Check if the column exists
    const tableDescription = await queryInterface.describeTable('users');
    
    if (tableDescription.friendCode) {
      await queryInterface.removeColumn('users', 'friendCode', { transaction });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
