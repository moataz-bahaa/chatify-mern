import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import helmet from 'helmet';
import xss from 'xss-clean';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import 'express-async-errors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

// local imports
import connectDB from './db/connect.js';

// middlewares
import notFoundMiddleware from './middleware/not-found.js';
import errorHandlerMiddleware from './middleware/error-handler.js';
import authenticateUser from './middleware/auth.js';

// routes
import authRoute from './routes/auth.js';
import chatRoute from './routes/chat.js';
import messageRoute from './routes/message.js';
import path from 'path';

const app = express();

if (process.env.NODE_ENV !== 'production') {
  // app.use(morgan('dev'));
}

// middlewares
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(xss());
app.use(mongoSanitize());
app.use(express.static(path.resolve('client', 'build')));

// api routes
app.use('/api/v1/auth', authRoute);
app.use('/api/v1/chat', authenticateUser, chatRoute);
app.use('/api/v1/message', authenticateUser, messageRoute);

app.get('*', (req, res) => {
  res.sendFile(path.resolve('client', 'build', 'index.html'));
});

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const port = process.env.PORT || 5000;
const server = createServer(app);

(async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    server.listen(port, () => console.log(`Server Running on port : ${port}...`));
  } catch (error) {
    console.log(error);
  }
})();

// **************************************************
// socket.io

const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: '*',
  },
});

io.on('connection', (socket) => {
  //connected to correct id
  socket.on('setup', (userData) => {
    socket.join(userData._id);
    socket.emit('connected');
  });

  socket.on('join-chat', (room) => {
    socket.join(room);
  });

  socket.on('typing', (room) => socket.in(room).emit('typing'));
  socket.on('stop-typing', (room) => socket.in(room).emit('stop-typing'));

  socket.on('new-message', (newMessageReceived) => {
    let chat = newMessageReceived.chat;

    if (!chat.users) return console.log(`chat.users not defined`);

    chat.users.forEach((user) => {
      if (user._id === newMessageReceived.sender._id) return;

      socket.in(user._id).emit('message-received', newMessageReceived);
    });
  });

  socket.off('setup', () => {
    socket.leave(userData._id);
  });
});
