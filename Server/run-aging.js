import updateClientAging from './jobs/updateClientAging.js';

try {
  await updateClientAging();
  console.log('✅ Aging update complete.');
} catch (err) {
  console.error('❌ Error running aging update:', err);
}
