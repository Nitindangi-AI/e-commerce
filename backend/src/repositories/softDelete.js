const db = require("../../config/db");

/**
 * Soft delete a record in a table by setting deleted_at = now()
 * @param {string} table - The table name
 * @param {string} id - The record ID
 * @returns {Promise<object>} The database query result
 */
exports.softDelete = (table, id) => {
  const allowedTables = ["products", "orders"];
  if (!allowedTables.includes(table)) {
    throw new Error(`Soft delete not allowed for table: ${table}`);
  }
  return db.query(`UPDATE ${table} SET deleted_at = now() WHERE id = $1 RETURNING *`, [id]);
};
