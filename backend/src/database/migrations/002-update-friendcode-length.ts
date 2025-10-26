/**
 * Migration: Update friendCode column length from VARCHAR(12) to VARCHAR(15)
 * Reason: Friend codes include dashes (XXX-XXX-XXX-X format = 15 chars)
 */

export async function up(queryInterface: any): Promise<void> {
  await queryInterface.changeColumn('users', 'friendCode', {
    type: 'VARCHAR(15)',
    allowNull: false,
    unique: true,
  });
}

export async function down(queryInterface: any): Promise<void> {
  await queryInterface.changeColumn('users', 'friendCode', {
    type: 'VARCHAR(12)',
    allowNull: false,
    unique: true,
  });
}
