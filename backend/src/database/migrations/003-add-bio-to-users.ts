import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  const transaction = await queryInterface.sequelize.transaction();
  
  try {
    // Check if the column already exists
    const tableDescription = await queryInterface.describeTable('users');
    
    if (!tableDescription.bio) {
      await queryInterface.addColumn('users', 'bio', {
        type: DataTypes.TEXT,
        allowNull: true,
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
    
    if (tableDescription.bio) {
      await queryInterface.removeColumn('users', 'bio', { transaction });
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
