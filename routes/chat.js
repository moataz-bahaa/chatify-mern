import express from 'express';
const router = express.Router();

import {
  getChat,
  getChats,
  createGroup,
  renameGroup,
  removeFromGroup,
  addUserToGroup,
} from '../controllers/chat.js';

router.get('/', getChats);
router.get('/:userId', getChat);
router.post('/createGroup', createGroup);
router.patch('/renameGroup', renameGroup);
router.patch('/removeFromGroup', removeFromGroup);
router.patch('/addUserToGroup', addUserToGroup);

export default router;
