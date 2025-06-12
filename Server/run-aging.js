import updateClientAging from './utils/updateClientAging.js';
import db from './utils/db.js';

try {
  await updateClientAging();
  console.log('✅ Aging update complete.');
} catch (err) {
  console.error('❌ Error running aging update:', err);
} finally {
  await db.end(); // <--- close the connection pool
}
