import { Router } from '../router.js';
import { deleteAllUserData } from '../services/dynamodb.js';

const router = new Router();

router.delete('/account/data', async (request) => {
  if (!request.userId) {
    throw { statusCode: 401, body: { error: 'Unauthorized' } };
  }

  await deleteAllUserData(request.userId);
  return { statusCode: 200, body: { deleted: true } };
});

export default router;
