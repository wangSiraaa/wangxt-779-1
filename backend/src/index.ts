import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB } from './db';
import routes from './routes';
import { seedProtectionZones } from './seed';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use('/api', routes);

const startServer = async () => {
  await connectDB();
  await seedProtectionZones();
  
  app.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
    console.log(`📊 API 文档: http://localhost:${PORT}/api/health`);
  });
};

startServer().catch(console.error);

export default app;
